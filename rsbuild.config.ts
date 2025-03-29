import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import UnoCSS from '@unocss/postcss'
import packageJson from './package.json'

const IS_PROD = process.env.NODE_ENV === 'production';

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  plugins: [
    pluginSass(),
    pluginVue(),
  ],
  output: {
    assetPrefix: IS_PROD ? './' /* cdn */ : './',
    cleanDistPath: IS_PROD,
  },
  server: {
    base: '/web',
    compress: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: false,
      },
    }
  },
  html: {
    template: './index.html',
  },
  tools: {
    postcss: {
      postcssOptions: {
        plugins: [
          UnoCSS(),
          require('postcss-import'), // inline @import
          require('postcss-preset-env')({
            stage: 2,
            features: {
              'oklab-function': true,
            },
          }),
        ],
      }
    },
  },
});
