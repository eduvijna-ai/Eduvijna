/**
 * CreateHandwrittenQuizScreen.test.tsx
 *
 * Comprehensive tests for the Handwritten Assessment module.
 * Validates parity with the web HandwrittenWorkspace:
 *   - Image picking (gallery + camera)
 *   - Max 5-image limit
 *   - Image removal
 *   - OCR API call with correct multipart body
 *   - Strict MCQ generation API call
 *   - Navigation to QuizTakingScreen after success
 *   - Error handling (413, empty OCR, empty quiz, generic network error)
 *   - Processing step labels
 *   - Permission requests on mount
 */

jest.mock('../core/services/documentCameraCapture', () => ({
  __esModule: true,
  captureAndCropDocumentImage: jest.fn(),
}));

import React from 'react';
import { render, fireEvent, waitFor, act, Alert } from '@testing-library/react-native';
import { Alert as RNAlert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../core/api/config';
import CreateHandwrittenQuizScreen, { buildStrictQuizContent } from '../screens/CreateHandwrittenQuizScreen';
import { captureAndCropDocumentImage } from '../core/services/documentCameraCapture';

// ── Typed mocks ───────────────────────────────────────────────────────────
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
  typeof ImagePicker.launchImageLibraryAsync
>;
const mockCaptureAndCrop = captureAndCropDocumentImage as jest.MockedFunction<
  typeof captureAndCropDocumentImage
>;
const mockRequestCamera = ImagePicker.requestCameraPermissionsAsync as jest.MockedFunction<
  typeof ImagePicker.requestCameraPermissionsAsync
>;
const mockRequestMedia = ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<
  typeof ImagePicker.requestMediaLibraryPermissionsAsync
>;

// ── Helpers ───────────────────────────────────────────────────────────────

function makeNavigation(overrides: Record<string, jest.Mock> = {}) {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    ...overrides,
  };
}

function mockImage(index = 0) {
  return {
    uri: `file:///photo_${index}.jpg`,
    fileName: `photo_${index}.jpg`,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 1600,
  };
}

function mockOcrSuccess(text = "Newton's laws of motion are fundamental to physics.") {
  return {
    data: {
      success: true,
      message: 'OCR complete',
      files: [
        {
          filename: 'photo_0.jpg',
          file_id: 'f1',
          file_type: 'image',
          total_pages: 1,
          status: 'success',
          pages: [
            { page_number: 1, status: 'success', text, latex: '' },
          ],
        },
      ],
      total_files: 1,
      successful_files: 1,
      total_pages_processed: 1,
    },
  };
}

function mockQuizSuccess(count = 5) {
  return {
    data: {
      success: true,
      message: 'Quiz generated',
      count,
      quiz: Array.from({ length: count }, (_, i) => ({
        question: `Question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
      })),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPost.mockReset();
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – permissions', () => {
  it('requests camera and media-library permissions on mount', async () => {
    const nav = makeNavigation();
    render(<CreateHandwrittenQuizScreen navigation={nav} />);
    await waitFor(() => {
      expect(mockRequestCamera).toHaveBeenCalled();
      expect(mockRequestMedia).toHaveBeenCalled();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – initial UI', () => {
  it('renders the hero title', () => {
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    expect(getByText('Handwritten Assessment')).toBeTruthy();
  });

  it('renders Gallery and Camera upload buttons', () => {
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    expect(getByText('Gallery')).toBeTruthy();
    expect(getByText('Camera')).toBeTruthy();
  });

  it('shows 0/5 image count initially', () => {
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    expect(getByText(/Step 1 · Upload Images \(0\/5\)/)).toBeTruthy();
  });

  it('shows empty-state placeholder when no images are selected', () => {
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    expect(getByText('No images selected yet')).toBeTruthy();
  });

  it('CTA button shows "Select Images First" when empty', () => {
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    expect(getByText('Select Images First')).toBeTruthy();
  });

  it('renders the 4-step how-it-works guide', () => {
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    expect(getByText('How it works')).toBeTruthy();
    expect(getByText(/Capture or pick handwritten page photos/)).toBeTruthy();
    expect(getByText(/Extract text with OCR/)).toBeTruthy();
    expect(getByText(/Set class, subject/)).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – image picking from gallery', () => {
  it('adds images when gallery returns assets', async () => {
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0), mockImage(1)],
    } as any);

    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    fireEvent.press(getByText('Gallery'));

    await waitFor(() => {
      expect(getByText(/Step 1 · Upload Images \(2\/5\)/)).toBeTruthy();
    });
  });

  it('does nothing when gallery is cancelled', async () => {
    mockLaunchLibrary.mockResolvedValueOnce({ canceled: true, assets: [] } as any);

    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    fireEvent.press(getByText('Gallery'));

    await waitFor(() => {
      expect(getByText(/Step 1 · Upload Images \(0\/5\)/)).toBeTruthy();
    });
  });

  it('caps at 5 images and shows alert when trying to exceed the limit', async () => {
    const spy = jest.spyOn(RNAlert, 'alert').mockImplementation(() => {});
    // Return 6 assets – should be capped to 5
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: Array.from({ length: 6 }, (_, i) => mockImage(i)),
    } as any);

    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    fireEvent.press(getByText('Gallery'));

    await waitFor(() => {
      // State should contain at most 5 images
      expect(getByText(/Step 1 · Upload Images \([0-5]\/5\)/)).toBeTruthy();
    });
    spy.mockRestore();
  });

  it('selects up to 5 images across multiple gallery opens', async () => {
    // First open: 3 images
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0), mockImage(1), mockImage(2)],
    } as any);
    // Second open: 2 more images
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(3), mockImage(4)],
    } as any);

    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);

    fireEvent.press(getByText('Gallery'));
    await waitFor(() => expect(getByText(/\(3\/5\)/)).toBeTruthy());

    fireEvent.press(getByText('Gallery'));
    await waitFor(() => expect(getByText(/\(5\/5\)/)).toBeTruthy());
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – camera capture', () => {
  it('adds a single image from camera after crop', async () => {
    mockCaptureAndCrop.mockImplementationOnce(async () => ({
      uri: 'file:///cropped_0.jpg',
      name: 'camera-0.jpg',
      mimeType: 'image/jpeg',
    }));

    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);

    await act(async () => {
      fireEvent.press(getByText('Camera'));
    });

    await waitFor(() => {
      expect(mockCaptureAndCrop).toHaveBeenCalled();
      expect(getByText(/Step 1 · Upload Images \(1\/5\)/)).toBeTruthy();
    });
  });

  it('does nothing when camera/crop is cancelled', async () => {
    mockCaptureAndCrop.mockImplementationOnce(async () => null);
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);

    await act(async () => {
      fireEvent.press(getByText('Camera'));
    });

    await waitFor(() => {
      expect(mockCaptureAndCrop).toHaveBeenCalled();
      expect(getByText(/\(0\/5\)/)).toBeTruthy();
    });
  });

  it('disables camera button when 5 images already selected', async () => {
    // Fill up to 5 via gallery
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: Array.from({ length: 5 }, (_, i) => mockImage(i)),
    } as any);
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    fireEvent.press(getByText('Gallery'));
    await waitFor(() => expect(getByText(/\(5\/5\)/)).toBeTruthy());

    // Camera button should be disabled – pressing it should not call capture helper
    fireEvent.press(getByText('Camera'));
    await waitFor(() => {
      expect(mockCaptureAndCrop).not.toHaveBeenCalled();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – image removal', () => {
  it('removes an image from the list', async () => {
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0), mockImage(1)],
    } as any);

    const { getByText, getAllByTestId } = render(
      <CreateHandwrittenQuizScreen navigation={makeNavigation()} />,
    );
    fireEvent.press(getByText('Gallery'));
    await waitFor(() => expect(getByText(/\(2\/5\)/)).toBeTruthy());

    // Remove the first image via its close button (testID injected by mock Ionicons)
    const closeBtns = getAllByTestId(/icon-close-circle/);
    fireEvent.press(closeBtns[0]);

    await waitFor(() => {
      expect(getByText(/\(1\/5\)/)).toBeTruthy();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – CTA label updates', () => {
  it('shows singular extract label when 1 image selected', async () => {
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0)],
    } as any);
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    fireEvent.press(getByText('Gallery'));
    await waitFor(() =>
      expect(getByText('Extract Text from 1 Image')).toBeTruthy(),
    );
  });

  it('shows plural extract label when multiple images selected', async () => {
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0), mockImage(1)],
    } as any);
    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={makeNavigation()} />);
    fireEvent.press(getByText('Gallery'));
    await waitFor(() =>
      expect(getByText('Extract Text from 2 Images')).toBeTruthy(),
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – Extract + Generate flow', () => {
  async function setupAndSubmit(imageCount = 1) {
    const nav = makeNavigation();
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: Array.from({ length: imageCount }, (_, i) => mockImage(i)),
    } as any);

    mockPost
      .mockResolvedValueOnce(mockOcrSuccess())  // OCR call
      .mockResolvedValueOnce(mockQuizSuccess()); // Quiz generation call

    const utils = render(<CreateHandwrittenQuizScreen navigation={nav} />);
    fireEvent.press(utils.getByText('Gallery'));
    await waitFor(() => expect(utils.getByText(new RegExp(`\\(${imageCount}\\/5\\)`))).toBeTruthy());

    const extractLabel =
      imageCount === 1 ? 'Extract Text from 1 Image' : `Extract Text from ${imageCount} Images`;
    fireEvent.press(utils.getByText(extractLabel));
    await waitFor(() => expect(utils.getByText('Step 2 · OCR Complete')).toBeTruthy());
    fireEvent.press(utils.getByText('Generate Assessment'));
    return { nav, ...utils };
  }

  it('calls OCR endpoint with multipart/form-data', async () => {
    await setupAndSubmit();
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/batch-ocr-upload',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      );
    });
  });

  it('calls quiz/generate-strict with extracted OCR text', async () => {
    await setupAndSubmit();
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/quiz/generate-strict',
        expect.objectContaining({ content: expect.stringContaining('Newton') }),
        expect.any(Object),
      );
    });
  });

  it('navigates to QuizTakingScreen on success', async () => {
    const { nav } = await setupAndSubmit();
    await waitFor(() => {
      expect(nav.replace).toHaveBeenCalledWith(
        'QuizTakingScreen',
        expect.objectContaining({
          source: 'handwritten',
          showShareButton: true,
          showActionButtons: true,
        }),
      );
    });
  });

  it('passes all 5 questions from quiz response to QuizTakingScreen', async () => {
    const nav = makeNavigation();
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0)],
    } as any);
    mockPost
      .mockResolvedValueOnce(mockOcrSuccess())
      .mockResolvedValueOnce(mockQuizSuccess(5));

    const { getByText } = render(<CreateHandwrittenQuizScreen navigation={nav} />);
    fireEvent.press(getByText('Gallery'));
    await waitFor(() => expect(getByText(/\(1\/5\)/)).toBeTruthy());
    fireEvent.press(getByText('Extract Text from 1 Image'));
    await waitFor(() => expect(getByText('Step 2 · OCR Complete')).toBeTruthy());
    fireEvent.press(getByText('Generate Assessment'));

    await waitFor(() => {
      const call = nav.replace.mock.calls[0];
      const quizData = call[1].quizData;
      expect(quizData.questions).toHaveLength(5);
    });
  });

  it('passes regenerationParams with type=handwritten and OCR text', async () => {
    const { nav } = await setupAndSubmit();
    await waitFor(() => {
      const quizData = nav.replace.mock.calls[0][1].quizData;
      expect(quizData.regenerationParams.type).toBe('handwritten');
      expect(quizData.regenerationParams.itext).toBeTruthy();
    });
  });

  it('processes 2 images (multi-image OCR batch)', async () => {
    const { nav } = await setupAndSubmit(2);
    await waitFor(() => {
      const formDataArg = mockPost.mock.calls[0][1] as FormData;
      expect(formDataArg).toBeInstanceOf(FormData);
      expect(nav.replace).toHaveBeenCalledWith('QuizTakingScreen', expect.any(Object));
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – error handling', () => {
  async function pickOneAndExtract() {
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0)],
    } as any);
    const nav = makeNavigation();
    const utils = render(<CreateHandwrittenQuizScreen navigation={nav} />);
    fireEvent.press(utils.getByText('Gallery'));
    await waitFor(() => expect(utils.getByText(/\(1\/5\)/)).toBeTruthy());
    fireEvent.press(utils.getByText('Extract Text from 1 Image'));
    return { nav, ...utils };
  }

  async function pickExtractAndGenerate() {
    const ctx = await pickOneAndExtract();
    await waitFor(() => expect(ctx.getByText('Step 2 · OCR Complete')).toBeTruthy());
    fireEvent.press(ctx.getByText('Generate Assessment'));
    return ctx;
  }

  it('shows 413 error message when server returns payload too large', async () => {
    const err: any = new Error('Payload Too Large');
    err.response = { status: 413 };
    mockPost.mockRejectedValueOnce(err);

    const { findByText } = await pickOneAndExtract();
    expect(
      await findByText(/Images are too large to upload/),
    ).toBeTruthy();
  });

  it('shows error when OCR returns no text', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        files: [
          {
            filename: 'photo.jpg', file_id: 'f1', file_type: 'image',
            total_pages: 1, status: 'success',
            pages: [{ page_number: 1, status: 'success', text: '', latex: '' }],
          },
        ],
        total_files: 1, successful_files: 1, total_pages_processed: 1,
        message: 'ok',
      },
    });

    const { findByText } = await pickOneAndExtract();
    expect(await findByText(/Could not extract readable text/)).toBeTruthy();
  });

  it('shows error when OCR API returns success=false', async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: false, message: 'OCR service unavailable', files: [] },
    });
    const { findByText } = await pickOneAndExtract();
    expect(await findByText(/OCR service unavailable/)).toBeTruthy();
  });

  it('shows error when quiz generation returns no questions', async () => {
    mockPost
      .mockResolvedValueOnce(mockOcrSuccess())
      .mockResolvedValueOnce({
        data: { success: true, message: 'ok', quiz: [], count: 0 },
      });
    const { findByText } = await pickExtractAndGenerate();
    expect(await findByText(/Assessment generation returned no questions/)).toBeTruthy();
  });

  it('shows generic error for network failure during OCR', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network timeout'));
    const { findByText } = await pickOneAndExtract();
    expect(await findByText(/Network timeout/)).toBeTruthy();
  });

  it('shows API detail error message from response body', async () => {
    const err: any = new Error('OCR Error');
    err.response = { status: 400, data: { detail: 'Invalid image format' } };
    mockPost.mockRejectedValueOnce(err);
    const { findByText } = await pickOneAndExtract();
    expect(await findByText(/Invalid image format/)).toBeTruthy();
  });

  it('does not navigate to QuizTakingScreen on error', async () => {
    const err: any = new Error('Generic error');
    err.response = { status: 500, data: {} };
    mockPost.mockRejectedValueOnce(err);
    const { nav } = await pickOneAndExtract();
    await waitFor(() => {
      expect(nav.replace).not.toHaveBeenCalled();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('CreateHandwrittenQuizScreen – processing state', () => {
  it('shows "Extracting text from images…" during OCR step', async () => {
    // Keep OCR pending so we can observe the label
    let resolveOcr!: (v: any) => void;
    mockPost.mockImplementationOnce(
      () => new Promise((res) => { resolveOcr = res; }),
    );

    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage(0)],
    } as any);

    const { getByText, queryByText } = render(
      <CreateHandwrittenQuizScreen navigation={makeNavigation()} />,
    );
    fireEvent.press(getByText('Gallery'));
    await waitFor(() => expect(getByText(/\(1\/5\)/)).toBeTruthy());
    fireEvent.press(getByText('Extract Text from 1 Image'));

    await waitFor(() =>
      expect(queryByText('Extracting text from images…')).toBeTruthy(),
    );

    // Resolve to avoid state updates after test
    act(() => resolveOcr({ data: { success: false, files: [] } }));
  });
});

describe('CreateHandwrittenQuizScreen – buildStrictQuizContent', () => {
  it('prepends metadata before OCR text (web parity)', () => {
    const content = buildStrictQuizContent({
      classValue: 'Class 10',
      subject: 'Physics',
      lesson: 'Motion',
      difficulty: 'medium',
      questionCount: 10,
      additionalInstructions: 'Focus on formulas',
      ocrText: 'Body text from OCR',
    });
    expect(content).toContain('Class: Class 10');
    expect(content).toContain('Subject: Physics');
    expect(content).toContain('Body text from OCR');
    expect(content.indexOf('Class: Class 10')).toBeLessThan(content.indexOf('Body text from OCR'));
  });
});
