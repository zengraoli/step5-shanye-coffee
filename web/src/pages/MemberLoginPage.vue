<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ApiError } from '@/api/client'
import { sendSmsCode } from '@/api/member'
import BrandLogo from '@/components/BrandLogo.vue'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const phone = ref('')
const code = ref('')
const error = ref('')
const tip = ref('')
const submitting = ref(false)
const sending = ref(false)

const redirect = () => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : '/member'
}

const onSendCode = async () => {
  error.value = ''
  tip.value = ''
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    error.value = '请输入正确的 11 位手机号'
    return
  }
  sending.value = true
  try {
    const result = await sendSmsCode(phone.value)
    tip.value = `验证码已发送（演示环境固定 ${result.code}）`
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '验证码发送失败，请稍后重试'
  } finally {
    sending.value = false
  }
}

const onSubmit = async (event: Event) => {
  event.preventDefault()
  error.value = ''
  tip.value = ''
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    error.value = '请输入正确的 11 位手机号'
    return
  }
  if (code.value.length !== 6) {
    error.value = '请输入 6 位验证码'
    return
  }
  submitting.value = true
  try {
    await login(phone.value, code.value)
    router.replace(redirect())
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="member-login">
    <div class="member-login__art" aria-hidden="true">
      <svg viewBox="0 0 520 640" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <rect width="520" height="640" fill="#4a3728" />
        <circle cx="400" cy="140" r="120" fill="#e8b87d" opacity="0.18" />
        <circle cx="400" cy="140" r="64" fill="#e8b87d" opacity="0.55" />
        <path d="M0 430L140 290l130 110 130-120 120 150v210H0V430z" fill="#6b4f3a" />
        <path d="M0 520L180 380l150 130 190-140v290H0V520z" fill="#33261c" />
        <g transform="translate(180 400)">
          <path d="M40 60h120v56a52 52 0 0 1-52 52h-16a52 52 0 0 1-52-52V60z" fill="#faf6ef" stroke="#33261c" stroke-width="4" />
          <path d="M40 60h120" stroke="#33261c" stroke-width="4" stroke-linecap="round" />
          <path d="M160 70h18a26 26 0 0 1 0 52h-12" stroke="#33261c" stroke-width="4" stroke-linecap="round" />
          <g stroke="#c89b6a" stroke-width="4" stroke-linecap="round">
            <path d="M74 44c8-8 0-16 0-24M100 38c9-9 0-19 0-29M126 44c8-8 0-16 0-24" />
          </g>
        </g>
      </svg>
    </div>

    <div class="member-login__panel">
      <RouterLink to="/" class="brand-mark member-login__brand">
        <BrandLogo :size="36" />
        <span class="brand-mark__name">山野咖啡</span>
      </RouterLink>

      <h1 class="member-login__title">会员登录</h1>
      <p class="member-login__desc">手机号登录后即可查看订单、积分、等级与优惠券。</p>

      <form class="member-login__form" @submit="onSubmit">
        <div class="field">
          <label for="phone">手机号</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="请输入 11 位手机号"
            autocomplete="tel"
          />
        </div>
        <div class="field">
          <label for="code">验证码</label>
          <div class="field__row">
            <input
              id="code"
              v-model="code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="6 位验证码"
              autocomplete="one-time-code"
            />
            <button type="button" class="btn btn-outline field__send" :disabled="sending" @click="onSendCode">
              {{ sending ? '发送中' : '获取验证码' }}
            </button>
          </div>
        </div>

        <p v-if="tip" class="member-login__tip">{{ tip }}</p>
        <p v-if="error" role="alert" class="member-login__error">{{ error }}</p>

        <button type="submit" class="btn btn-primary member-login__submit" :disabled="submitting">
          {{ submitting ? '登录中' : '登录' }}
        </button>
      </form>

      <p class="member-login__note">演示环境验证码固定为 123456，未注册手机号将自动创建会员。</p>
      <RouterLink to="/" class="member-login__back">← 返回首页</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.member-login {
  display: grid;
  min-height: calc(100vh - var(--header-height));
}

.member-login__art {
  display: none;
}

.member-login__panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 420px;
  margin-inline: auto;
  padding: var(--space-7) var(--space-5);
}

.member-login__brand {
  margin-bottom: var(--space-6);
}

.member-login__title {
  font-size: var(--text-3xl);
  color: var(--color-primary-strong);
}

.member-login__desc {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.member-login__form {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.field {
  display: grid;
  gap: var(--space-2);
}

.field label {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.field input {
  width: 100%;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  padding: 11px var(--space-4);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input:focus {
  outline: none;
  border-color: var(--caramel-500);
  box-shadow: 0 0 0 3px rgb(200 155 106 / 22%);
}

.field__row {
  display: flex;
  gap: var(--space-3);
}

.field__row input {
  flex: 1;
}

.field__send {
  flex: none;
}

.member-login__tip {
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: rgb(125 155 106 / 12%);
  font-size: var(--text-sm);
  color: var(--matcha-600);
}

.member-login__error {
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: rgb(180 68 47 / 10%);
  font-size: var(--text-sm);
  color: #a4442f;
}

.member-login__submit {
  padding-block: 12px;
}

.member-login__note {
  margin-top: var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.member-login__back {
  margin-top: var(--space-5);
  font-size: var(--text-sm);
  color: var(--color-accent-strong);
}

@media (min-width: 1024px) {
  .member-login {
    grid-template-columns: 1fr 1fr;
  }

  .member-login__art {
    display: block;
    position: relative;
    overflow: hidden;
  }

  .member-login__art svg {
    width: 100%;
    height: 100%;
  }
}
</style>
