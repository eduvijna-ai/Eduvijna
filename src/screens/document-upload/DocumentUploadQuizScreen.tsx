import React from 'react';
import QuizTakingScreen from '../QuizTakingScreen';

export default function DocumentUploadQuizScreen(props: any) {
  const params = props?.route?.params || {};
  const {
    quizData,
    previewBook,
    returnScreen,
    previewFormState,
    source,
    workspaceMode,
    assessmentId,
    initialResponses,
    showActionButtons,
    showShareButton,
  } = params;

  return (
    <QuizTakingScreen
      {...props}
      route={{
        ...props.route,
        params: {
          ...params,
          quiz: quizData,
          source: source === 'history' ? 'history' : 'document-upload',
          workspaceMode:
            workspaceMode ||
            (source === 'handwritten' ? 'handwritten' : 'document'),
          hideStackHeader: true,
          showActionButtons: showActionButtons ?? true,
          showShareButton: showShareButton ?? true,
          previewBook,
          returnScreen,
          previewFormState,
          assessmentId,
          initialResponses,
        },
      }}
    />
  );
}
