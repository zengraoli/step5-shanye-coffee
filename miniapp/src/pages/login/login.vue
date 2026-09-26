<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ApiError } from '@/api/client'

const router = useRouter()
const route = useRoute()
const { login, sendCode } = useAuth()

const phone = ref('')
const code = ref('')
const error = ref('')
const tip = ref('')
const submitting = ref(false)
const sending = ref(false)

const redirect = () => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/pages/') ? target : '/pages/profile/profile'
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
    const demoCode = await sendCode(phone.value)
    tip.value = `验证码已发送（演示环境固定 ${demoCode}）`
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '验证码发送失败，请稍后重试'
  } finally {
    sending.value = false
  }
}

const onSubmit = async () => {
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
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      router.replace(redirect())
    }, 400)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="login">
    <!-- 品牌头图 -->
    <view class="login__hero" aria-hidden="true">
      <view class="login__sun" />
      <view class="login__hill login__hill--far" />
      <view class="login__hill login__hill--near" />
      <view class="login__cup"><view class="login__cup-handle" /></view>
    </view>

    <view class="login__panel">
      <text class="login__brand">山野咖啡</text>
      <text class="login__slogan">山野之间，一杯好咖啡。</text>

      <view class="login__form">
        <view class="field">
          <text class="field__label">手机号</text>
          <input
            v-model="phone"
            class="field__input"
            type="number"
            maxlength="11"
            placeholder="请输入 11 位手机号"
          />
        </view>
        <view class="field">
          <text class="field__label">验证码</text>
          <view class="field__row">
            <input
              v-model="code"
              class="field__input"
              type="number"
              maxlength="6"
              placeholder="6 位验证码"
            />
            <text class="field__send" :class="{ 'is-disabled': sending }" @click="onSendCode">
              {{ sending ? '发送中' : '获取验证码' }}
            </text>
          </view>
        </view>

        <view v-if="tip" class="login__tip">{{ tip }}</view>
        <view v-if="error" class="login__error">{{ error }}</view>

        <view class="login__submit" :class="{ 'is-disabled': submitting }" @click="onSubmit">
          {{ submitting ? '登录中' : '登录' }}
        </view>
      </view>

      <view class="login__note">
        <text>演示环境验证码固定为 123456</text>
        <text>未注册手机号首次登录将自动创建会员</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login {
  min-height: 100vh;
  background: $color-bg;
}

/* 品牌头图 */
.login__hero {
  position: relative;
  height: 300rpx;
  overflow: hidden;
  background: linear-gradient(160deg, #f9eedd, #f3dfc4);
}

.login__sun {
  position: absolute;
  top: 30rpx;
  right: 90rpx;
  width: 130rpx;
  height: 130rpx;
  border-radius: 50%;
  background: radial-gradient(circle, #e8b87d 42%, rgb(232 184 125 / 0%) 72%);
}

.login__hill {
  position: absolute;
  bottom: -90rpx;
  width: 260rpx;
  height: 260rpx;
  border-radius: 36rpx;
  transform: rotate(45deg);
}

.login__hill--far {
  left: 40rpx;
  background: rgb(168 138 109 / 45%);
}

.login__hill--near {
  left: 170rpx;
  background: rgb(107 79 58 / 65%);
}

.login__cup {
  position: absolute;
  right: 90rpx;
  bottom: 44rpx;
  width: 72rpx;
  height: 66rpx;
  border-radius: 8rpx 8rpx 26rpx 26rpx;
  background: $paper;
  border: 4rpx solid $brand-900;
}

.login__cup-handle {
  position: absolute;
  top: 6rpx;
  right: -24rpx;
  width: 24rpx;
  height: 24rpx;
  border: 5rpx solid $brand-900;
  border-radius: 50%;
  border-left-color: transparent;
}

/* 面板 */
.login__panel {
  position: relative;
  margin: -60rpx $space-3 0;
  padding: $space-5 $space-4 $space-4;
  border-radius: $radius-lg;
  background: $color-surface;
  border: 1rpx solid $color-line;
  box-shadow: 0 10rpx 30rpx rgb(43 33 24 / 10%);
}

.login__brand {
  display: block;
  font-family: $font-display;
  font-size: 40rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
  color: $color-primary-strong;
}

.login__slogan {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: $color-text-faint;
}

.login__form {
  margin-top: $space-4;
}

.field {
  margin-bottom: $space-3;
}

.field__label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 24rpx;
  color: $color-text-soft;
}

.field__input {
  box-sizing: border-box;
  width: 100%;
  border: 1rpx solid $color-line-strong;
  border-radius: $radius-md;
  padding: $space-2 $space-3;
  background: $color-bg;
  font-size: 28rpx;
  color: $color-text;
}

.field__row {
  display: flex;
  gap: $space-2;
}

.field__row .field__input {
  flex: 1;
}

.field__send {
  flex: none;
  display: grid;
  place-items: center;
  border: 1rpx solid $caramel-500;
  border-radius: $radius-md;
  padding: 0 $space-3;
  font-size: 24rpx;
  color: $color-accent-strong;
  background: rgb(200 155 106 / 10%);
}

.field__send.is-disabled {
  opacity: 0.6;
}

.login__tip {
  margin-bottom: $space-2;
  padding: $space-2 $space-3;
  border-radius: $radius-sm;
  background: rgb(125 155 106 / 12%);
  font-size: 24rpx;
  color: $matcha-600;
}

.login__error {
  margin-bottom: $space-2;
  padding: $space-2 $space-3;
  border-radius: $radius-sm;
  background: rgb(180 68 47 / 10%);
  font-size: 24rpx;
  color: #a4442f;
}

.login__submit {
  margin-top: $space-3;
  border-radius: $radius-full;
  padding: $space-2 0;
  text-align: center;
  background: $color-primary;
  color: $cream-50;
  font-size: 30rpx;
  font-weight: 500;
  letter-spacing: 4rpx;
}

.login__submit.is-disabled {
  opacity: 0.7;
}

.login__note {
  margin-top: $space-4;
  display: grid;
  gap: 4rpx;
  text-align: center;
  font-size: 20rpx;
  color: $color-text-faint;
}
</style>
