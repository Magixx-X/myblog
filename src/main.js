import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// highlight.js 主题（代码高亮）—— 与站点暗色风格一致
import 'highlight.js/styles/github-dark.css'

// 全局样式
import './styles/base.css'
import './styles/markdown.css'

createApp(App).use(router).mount('#app')
