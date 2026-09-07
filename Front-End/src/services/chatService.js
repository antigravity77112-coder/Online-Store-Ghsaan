import { getApiBaseUrl } from '../utils/apiBaseUrl';

const BASE_URL = getApiBaseUrl();

export const chatService = {
  sendMessage: async (messages) => {
    try {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        throw new Error('Network Error');
      }

      return await response.json();
    } catch (error) {
      console.error('Chat Service Error:', error);
      throw error;
    }
  }
};
