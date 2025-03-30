import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'toolgen'

export const useOpenAIStore = defineStore('openai', {
  state: () => ({
    baseUrl: useStorage(`${STORAGE_KEY}_baseurl`, ''),
    apiKey: useStorage(`${STORAGE_KEY}_apikey`, ''),
    model: useStorage(`${STORAGE_KEY}_model`, 'gpt-4o'),
  }),
  getters: {
    chatCompletionAPI(state) {
      let baseUrl = state.baseUrl
      let hashPos = baseUrl.indexOf('#')
      if (hashPos !== -1) return baseUrl.slice(0, hashPos) // if contains hash, just take the part before it
      if (!baseUrl.endsWith('/')) baseUrl += '/v1/'  // if no trailing slash, add it with /v1/
      return `${state.baseUrl}chat/completions`
    }
  }
})
