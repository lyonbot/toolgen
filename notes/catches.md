# 记录一些catch的点

AI 生成的代码可能会出现的奇怪东西。

- 🔧: to be fixed
- ✅: done, via prompt / post-process / bundler config or plugin / etc.
- 😵‍💫: need further investigation

## Assets

🔧

```js
import logo from '/public/images/400x100/app-logo.png';
```

## Styling

✅ nothing, it just works like `@tailwind`

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
```
