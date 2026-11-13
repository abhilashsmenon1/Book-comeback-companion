/**
 * Future server-side boundary. The only reading context is notes deliberately
 * supplied by the user. Use only those notes, omit inferred plot and spoilers,
 * and return null when there is insufficient context. Never request book text.
 */
export interface RestartCard {
  reminder: string;
  recallQuestions: readonly string[];
}

export interface RestartAssistant {
  createCard(input: { notes: string }): Promise<RestartCard | null>;
}
