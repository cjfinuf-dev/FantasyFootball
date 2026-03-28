import client from "./client";

export const getMessages = (leagueId: string, before?: string, limit?: number) =>
  client.get(`/api/leagues/${leagueId}/chat/messages`, { params: { before, limit } });

export const sendMessage = (leagueId: string, content: string, messageType: string = "text") =>
  client.post(`/api/leagues/${leagueId}/chat/messages`, { content, message_type: messageType });

export const reactToMessage = (leagueId: string, messageId: string, emoji: string) =>
  client.post(`/api/leagues/${leagueId}/chat/messages/${messageId}/react`, { emoji });

export const createPoll = (leagueId: string, question: string, options: string[]) =>
  client.post(`/api/leagues/${leagueId}/chat/polls`, { question, options });

export const votePoll = (leagueId: string, messageId: string, optionIndex: number) =>
  client.post(`/api/leagues/${leagueId}/chat/polls/${messageId}/vote`, { option_index: optionIndex });
