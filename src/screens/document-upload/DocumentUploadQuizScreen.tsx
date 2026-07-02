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
          source: source || 'document-upload',
          hideStackHeader: true,
          showActionButtons: showActionButtons ?? true,
          showShareButton: showShareButton ?? true,
          previewBook,
          returnScreen,
          previewFormState,
          workspaceMode,
          assessmentId,
          initialResponses,
        },
      }}
    />
  );
}
