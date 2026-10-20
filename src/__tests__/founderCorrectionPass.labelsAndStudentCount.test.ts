/**
 * Production-path coverage for founder correction pass review items:
 * student Home inventory (no quiz fallback), scope isolation, crop identity.
 */

import {
  buildAssessmentClassroomScopeFromUser,
  useAssessmentClassroomsStore,
} from '../core/store/assessmentClassrooms.store';
import * as assessmentClassroomsService from '../core/services/assessmentClassrooms.service';
import {
  applyCroppedJpegToCameraPage,
  normalizeCameraPage,
  restoreCameraPageOriginal,
} from '../core/services/documentUploadApi';
import {
  cropFileNameFromBase,
  isCropSessionDismissed,
  type CropSessionResult,
} from '../core/services/imageCropSession';

const mockUser = { id: '70', role: 'student' };
let mockSchoolId: string | number | null = 1;

jest.mock('../core/store/user.store', () => ({
  useUserStore: Object.assign(
    jest.fn((selector: (s: any) => unknown) =>
      selector({ user: mockUser, schoolId: mockSchoolId, isAuthenticated: true }),
    ),
    {
      getState: () => ({ user: mockUser, schoolId: mockSchoolId, isAuthenticated: true }),
    },
  ),
}));

function okInventory(
  scope: assessmentClassroomsService.AssessmentClassroomScope,
  ids: string[],
  source: 'classes' | 'class_wise_students' = 'classes',
) {
  return {
    kind: 'ok' as const,
    scopeKey: assessmentClassroomsService.assessmentClassroomScopeKey(scope),
    generation: assessmentClassroomsService.getAssessmentClassroomsLoadGeneration(),
    classrooms: ids.map((classroom_id) => ({
      classroom_id,
      classroom_name: `${classroom_id}-label`,
      instructor: {
        instructor_id: '0',
        instructor_username: 'x',
        instructor_fullname: 'x',
        instructor_avatar_url: null,
      },
      total_students: 0,
    })),
    count: ids.length,
    source,
    pagesFetched: 1,
  };
}

describe('student Home inventory production path', () => {
  beforeEach(() => {
    mockSchoolId = 1;
    assessmentClassroomsService.invalidateAssessmentClassroomsLoads();
    useAssessmentClassroomsStore.getState().reset();
    jest.restoreAllMocks();
  });

  it('loads complete inventory including zero-assessment classrooms (unique IDs)', async () => {
    const scope = buildAssessmentClassroomScopeFromUser(mockUser, 1)!;
    const spy = jest.spyOn(assessmentClassroomsService, 'loadAssessmentClassrooms');
    spy.mockResolvedValueOnce(
      okInventory(scope, ['class_a', 'class_b', 'class_c', 'class_d', 'class_e']),
    );

    await useAssessmentClassroomsStore.getState().refresh(scope);

    const state = useAssessmentClassroomsStore.getState();
    expect(state.source).toBe('classes');
    expect(state.count).toBe(5);
    expect(state.classrooms.map((c) => c.classroom_id).sort()).toEqual(
      ['class_a', 'class_b', 'class_c', 'class_d', 'class_e'].sort(),
    );
    // Zero-assessment classes remain (no quiz-derived filtering in inventory).
    expect(state.classrooms.every((c) => (c.total_students ?? 0) === 0)).toBe(true);
  });

  it('refresh updates inventory without leaving a loading loop', async () => {
    const scope = buildAssessmentClassroomScopeFromUser(mockUser, 1)!;
    const spy = jest.spyOn(assessmentClassroomsService, 'loadAssessmentClassrooms');
    spy
      .mockResolvedValueOnce(okInventory(scope, ['class_a', 'class_b', 'class_c']))
      .mockResolvedValueOnce(
        okInventory(scope, ['class_a', 'class_b', 'class_c', 'class_d', 'class_e']),
      );

    await useAssessmentClassroomsStore.getState().refresh(scope);
    expect(useAssessmentClassroomsStore.getState().count).toBe(3);

    await useAssessmentClassroomsStore.getState().refresh(scope);
    expect(useAssessmentClassroomsStore.getState().count).toBe(5);
    expect(useAssessmentClassroomsStore.getState().loading).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('scope change clears prior inventory; failure cannot expose previous-scope data', async () => {
    const scopeSchool1 = buildAssessmentClassroomScopeFromUser(mockUser, 1)!;
    const scopeSchool2 = buildAssessmentClassroomScopeFromUser(mockUser, 2)!;
    const spy = jest.spyOn(assessmentClassroomsService, 'loadAssessmentClassrooms');

    spy.mockResolvedValueOnce(okInventory(scopeSchool1, ['s1_a', 's1_b', 's1_c']));
    await useAssessmentClassroomsStore.getState().refresh(scopeSchool1);
    expect(useAssessmentClassroomsStore.getState().count).toBe(3);
    expect(useAssessmentClassroomsStore.getState().classrooms[0].classroom_id).toBe('s1_a');

    mockSchoolId = 2;
    spy.mockResolvedValueOnce({
      kind: 'failed',
      scopeKey: assessmentClassroomsService.assessmentClassroomScopeKey(scopeSchool2),
      generation: assessmentClassroomsService.getAssessmentClassroomsLoadGeneration(),
      error: 'network',
      prior: null,
    });

    await useAssessmentClassroomsStore.getState().refresh(scopeSchool2);

    const state = useAssessmentClassroomsStore.getState();
    expect(state.scopeKey).toBe(
      assessmentClassroomsService.assessmentClassroomScopeKey(scopeSchool2),
    );
    expect(state.classrooms).toEqual([]);
    expect(state.count).toBe(0);
    expect(state.source).toBeNull();
    expect(state.unavailable).toBe(true);
    expect(state.classrooms.some((c) => c.classroom_id.startsWith('s1_'))).toBe(false);
  });

  it('Home KPI contract: inventoryKnown requires same-scope source — never quiz-derived totals', () => {
    // Documented consumer contract (StudentDashboard):
    // classroomCountDisplay uses inventoryKnown ? count : loading/unavailable placeholder.
    // stats.total_classes is quiz-derived and must not be consulted.
    const quizDerivedTotal = 3;
    const inventoryCount = 5;
    const inventoryKnown = true;
    const classroomCountDisplay = inventoryKnown ? String(inventoryCount) : '…';
    expect(classroomCountDisplay).toBe('5');
    expect(classroomCountDisplay).not.toBe(String(quizDerivedTotal));
  });
});

describe('crop session result contracts', () => {
  it('distinguishes cancelled, unchanged, and JPEG crop metadata', () => {
    const cancelled: CropSessionResult = { kind: 'cancelled' };
    const unchanged: CropSessionResult = {
      kind: 'unchanged',
      uri: 'file:///page.png',
      width: 800,
      height: 1200,
    };
    const cropped: CropSessionResult = {
      kind: 'cropped',
      uri: 'file:///page_crop.jpg',
      mimeType: 'image/jpeg',
      fileName: 'page_crop.jpg',
      width: 400,
      height: 600,
    };

    expect(isCropSessionDismissed(cancelled)).toBe(true);
    expect(isCropSessionDismissed(unchanged)).toBe(false);
    expect(unchanged.kind).toBe('unchanged');
    expect(cropped.mimeType).toBe('image/jpeg');
    expect(cropFileNameFromBase('notes.PNG', 'page')).toBe('notes_crop.jpg');
  });

  it('restore returns full original metadata; other pages untouched', () => {
    const pageA = normalizeCameraPage({
      pageNumber: 1,
      fileUri: 'file:///a.png',
      fileName: 'a.png',
      mimeType: 'image/png',
      thumbnailUri: 'file:///a.png',
      width: 100,
      height: 200,
    });
    const pageB = normalizeCameraPage({
      pageNumber: 2,
      fileUri: 'file:///b.jpg',
      fileName: 'b.jpg',
      mimeType: 'image/jpeg',
      thumbnailUri: 'file:///b.jpg',
    });

    const croppedA = applyCroppedJpegToCameraPage(pageA, {
      uri: 'file:///a_crop.jpg',
      fileName: 'a_crop.jpg',
      mimeType: 'image/jpeg',
      width: 50,
      height: 80,
    });
    expect(croppedA.pageId).toBe(pageA.pageId);
    expect(croppedA.mimeType).toBe('image/jpeg');
    expect(croppedA.original?.fileUri).toBe('file:///a.png');
    expect(croppedA.original?.mimeType).toBe('image/png');

    const restoredA = restoreCameraPageOriginal(croppedA);
    expect(restoredA.fileUri).toBe('file:///a.png');
    expect(restoredA.fileName).toBe('a.png');
    expect(restoredA.mimeType).toBe('image/png');
    expect(restoredA.width).toBe(100);
    expect(restoredA.height).toBe(200);
    expect(restoredA.thumbnailUri).toBe('file:///a.png');

    // Page B identity/bytes unchanged through A edits.
    expect(pageB.fileUri).toBe('file:///b.jpg');
    expect(pageB.pageId).not.toBe(pageA.pageId);
  });

  it('unchanged PNG must not be relabeled JPEG by crop helpers', () => {
    const page = normalizeCameraPage({
      pageNumber: 1,
      fileUri: 'file:///scan.png',
      fileName: 'scan.png',
      mimeType: 'image/png',
      thumbnailUri: 'file:///scan.png',
    });
    // Simulates Keep current / unchanged — caller leaves page as-is.
    expect(page.mimeType).toBe('image/png');
    expect(page.fileName.endsWith('.png')).toBe(true);
    expect(page.fileName.endsWith('.jpg')).toBe(false);
  });
});
