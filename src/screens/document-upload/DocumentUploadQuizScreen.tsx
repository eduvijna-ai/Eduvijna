import React from 'react';
import QuizTakingScreen from '../QuizTakingScreen';

export default function DocumentUploadQuizScreen(props: any) {
  const quizData = props?.route?.params?.quizData;

  return (
    <QuizTakingScreen
      {...props}
      route={{
        ...props.route,
        params: {
          ...(props?.route?.params || {}),
          quiz: quizData,
          source: 'document-upload',
          showActionButtons: true,
          showShareButton: true,
        },
      }}
    />
  );
}
