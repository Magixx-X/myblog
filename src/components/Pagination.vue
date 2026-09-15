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
  <nav v-if="totalPages > 1" class="pager">
    <button class="pg-btn" :disabled="page === 1" @click="go(page - 1)">上一页</button>

    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '...'" class="pg-gap">…</span>
      <button v-else class="pg-btn num" :class="{ active: p === page }" @click="go(p)">
        {{ p }}
      </button>
    </template>

    <button class="pg-btn" :disabled="page === totalPages" @click="go(page + 1)">下一页</button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 36px;
  flex-wrap: wrap;
}

.pg-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elev);
  color: var(--text-dim);
  font-size: 13.5px;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.pg-btn:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--text-mute);
}

.pg-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}

.pg-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pg-gap {
  color: var(--text-mute);
  padding: 0 3px;
}
</style>
