export type Question = {
  id: string;
  text: string;
  type: "short_answer" | "multiple_choice" | "checkbox";
  anonymous: boolean;
};

export function buildStoredAnswer(question: Question, memberId: string, answer: unknown) {
  return {
    question_id: question.id,
    answer,
    member_id: question.anonymous ? null : memberId,
  };
}

export function assertAnonymousAnswersDoNotExposeMembers(
  answers: Array<{ question: Question; member_id: string | null }>,
) {
  return answers.every((answer) => !answer.question.anonymous || answer.member_id === null);
}
