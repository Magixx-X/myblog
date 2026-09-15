/**
 * 站点级配置 —— 改这里就能换掉全站文案
 */
export const site = {
  title: '我的博客',
  subtitle: '记录技术、思考与生活',
  description: '一个用 Vue + Markdown + Git 搭建的个人博客，写代码，也写人话。',
  author: 'Bill',
  email: 'bill@example.com',
  city: '苏州',
  since: 2024,
  // 页脚与关于页展示的社交链接，留空则自动隐藏
  socials: [
    { name: 'GitHub', url: 'https://github.com/', icon: 'github' },
    { name: '邮箱', url: 'mailto:bill@example.com', icon: 'mail' },
    { name: 'RSS', url: '/rss.xml', icon: 'rss' }
  ]
}

/** 首页每页文章数 */
export const PAGE_SIZE = 6

export default site
