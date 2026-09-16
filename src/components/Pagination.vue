<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  perPage: { type: Number, default: 6 }
})

const emit = defineEmits(['change'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))

/** 生成页码列表，超出部分用省略号折叠：1 … 4 5 6 … 20 */
const pages = computed(() => {
  const last = totalPages.value
  const cur = props.page
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const out = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(last - 1, cur + 1)

  if (start > 2) out.push('...')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < last - 1) out.push('...')
  out.push(last)

  return out
})

function go(p) {
  if (p === props.page || p < 1 || p > totalPages.value) return
  emit('change', p)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pager" aria-label="分页导航">
    <button class="pg-btn nav-btn" :disabled="page === 1" aria-label="上一页" @click="go(page - 1)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="m15 6-6 6 6 6" />
      </svg>
      上一页
    </button>

    <div class="pg-nums">
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '...'" class="pg-gap" aria-hidden="true">…</span>
        <button
          v-else
          class="pg-btn num"
          :class="{ active: p === page }"
          :aria-label="`第 ${p} 页`"
          :aria-current="p === page ? 'page' : undefined"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
    </div>

    <button class="pg-btn nav-btn" :disabled="page === totalPages" aria-label="下一页" @click="go(page + 1)">
      下一页
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin-top: var(--sp-10);
  padding-top: var(--sp-6);
  border-top: 1px solid var(--border-soft);
  flex-wrap: wrap;
}

.pg-nums {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.pg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 36px;
  height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elev);
  color: var(--text-dim);
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease),
    background-color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
}

.pg-btn:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--border-strong);
  background: var(--bg-hover);
}

.pg-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.pg-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
  font-weight: 650;
  box-shadow: 0 1px 2px var(--accent-glow);
}

.pg-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.nav-btn svg {
  opacity: 0.7;
}

.pg-gap {
  color: var(--text-mute);
  padding: 0 2px;
  user-select: none;
}

@media (max-width: 560px) {
  .nav-btn {
    padding: 0 10px;
  }

  /* 窄屏下只留箭头，省出页码空间 */
  .nav-btn {
    font-size: 0;
    gap: 0;
  }

  .nav-btn svg {
    width: 16px;
    height: 16px;
  }
}
</style>
