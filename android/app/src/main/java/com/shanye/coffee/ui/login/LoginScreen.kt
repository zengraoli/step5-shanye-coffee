package com.shanye.coffee.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.components.BrandMark
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.CreamBackground
import com.shanye.coffee.ui.theme.Terracotta
import com.shanye.coffee.ui.theme.TerracottaContainer
import com.shanye.coffee.ui.theme.TextPrimary
import com.shanye.coffee.ui.theme.TextSecondary

/**
 * 会员登录页（设计稿 AD1）。
 * 手机号 + 验证码（演示环境固定 123456），登录成功后回到原页面。
 */
@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    val container = LocalAppContainer.current
    val viewModel: LoginViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : androidx.lifecycle.ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = LoginViewModel(container.memberRepository) as T
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    LoginScreenContent(
        state = state,
        onPhoneChange = viewModel::onPhoneChange,
        onCodeChange = viewModel::onCodeChange,
        onToggleAgreed = viewModel::toggleAgreed,
        onSendCode = viewModel::sendCode,
        onSubmit = { viewModel.login(onLoggedIn) },
    )
}

@Composable
private fun LoginScreenContent(
    state: LoginUiState,
    onPhoneChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onToggleAgreed: () -> Unit,
    onSendCode: () -> Unit,
    onSubmit: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CreamBackground)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(56.dp))

        BrandMark(size = 72.dp)

        Spacer(modifier = Modifier.height(20.dp))
        Text(
            text = "山野咖啡",
            style = MaterialTheme.typography.displaySmall,
            color = TextPrimary,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "从山野来，到你杯中",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
        )

        Spacer(modifier = Modifier.height(40.dp))

        // 手机号
        DesignField {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 18.dp),
            ) {
                Text(
                    text = "+86",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium,
                )
                Spacer(modifier = Modifier.width(12.dp))
                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(20.dp)
                        .background(TextSecondary.copy(alpha = 0.35f)),
                )
                Spacer(modifier = Modifier.width(12.dp))
                BasicTextField(
                    value = state.phone,
                    onValueChange = onPhoneChange,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Phone,
                        imeAction = ImeAction.Next,
                    ),
                    textStyle = TextStyle(
                        color = TextPrimary,
                        fontSize = 15.sp,
                    ),
                    cursorBrush = SolidColor(BrandGreen),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 15.dp),
                    decorationBox = { innerTextField ->
                        if (state.phone.isEmpty()) {
                            Text(
                                text = "请输入手机号",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextSecondary.copy(alpha = 0.7f),
                            )
                        }
                        innerTextField()
                    },
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 验证码
        DesignField {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(start = 18.dp, end = 6.dp),
            ) {
                BasicTextField(
                    value = state.code,
                    onValueChange = onCodeChange,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done,
                    ),
                    textStyle = TextStyle(color = TextPrimary, fontSize = 15.sp),
                    cursorBrush = SolidColor(BrandGreen),
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 15.dp),
                    decorationBox = { innerTextField ->
                        if (state.code.isEmpty()) {
                            Text(
                                text = "验证码",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextSecondary.copy(alpha = 0.7f),
                            )
                        }
                        innerTextField()
                    },
                )
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(percent = 50))
                        .background(TerracottaContainer)
                        .clickable(enabled = state.canSendCode, onClick = onSendCode)
                        .padding(horizontal = 18.dp, vertical = 10.dp),
                ) {
                    if (state.sendingCode) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = Terracotta,
                        )
                    } else {
                        Text(
                            text = "获取验证码",
                            style = MaterialTheme.typography.labelLarge,
                            color = Terracotta,
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 用户协议
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Checkbox(
                checked = state.agreed,
                onCheckedChange = { onToggleAgreed() },
                colors = CheckboxDefaults.colors(
                    checkedColor = BrandGreen,
                    uncheckedColor = TextSecondary,
                    checkmarkColor = CreamBackground,
                ),
            )
            Text(
                text = "我已阅读并同意",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )
            Text(
                text = "《用户协议》",
                style = MaterialTheme.typography.bodySmall,
                color = BrandGreen,
                fontWeight = FontWeight.Medium,
            )
            Text(
                text = "《隐私政策》",
                style = MaterialTheme.typography.bodySmall,
                color = BrandGreen,
                fontWeight = FontWeight.Medium,
            )
        }

        if (state.codeTip != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = state.codeTip,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (state.error != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = state.error,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 登录 / 注册
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(percent = 50))
                .background(if (state.canSubmit || state.submitting) BrandGreen else BrandGreen.copy(alpha = 0.45f))
                .clickable(enabled = state.canSubmit, onClick = onSubmit),
            contentAlignment = Alignment.Center,
        ) {
            if (state.submitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = CreamBackground,
                )
            } else {
                Text(
                    text = "登录 / 注册",
                    style = MaterialTheme.typography.titleMedium,
                    color = CreamBackground,
                    fontWeight = FontWeight.Medium,
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "演示环境验证码固定 123456",
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary.copy(alpha = 0.8f),
            textAlign = TextAlign.Center,
        )
    }
}

/** 设计稿输入框：白底、22dp 圆角、细边框 */
@Composable
private fun DesignField(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(Color.White)
            .border(1.dp, Color(0xFFE8E2D5), MaterialTheme.shapes.medium),
    ) {
        content()
    }
}
