import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { Checkbox } from './checkbox'

/** 受控用法（与页面中的用法一致） */
function Controlled() {
  const [checked, setChecked] = useState(false)
  return (
    <div>
      <Checkbox
        aria-label="受控复选框"
        checked={checked}
        onCheckedChange={(value) => setChecked(value)}
      />
      <span data-testid="state">{checked ? 'on' : 'off'}</span>
    </div>
  )
}

describe('Checkbox', () => {
  test('受控：点击后勾选并同步 aria-checked', async () => {
    const user = userEvent.setup()
    render(<Controlled />)
    const box = screen.getByRole('checkbox', { name: '受控复选框' })
    expect(box.getAttribute('aria-checked')).toBe('false')

    await user.click(box)
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('state')).toHaveTextContent('on')

    await user.click(box)
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByTestId('state')).toHaveTextContent('off')
  })

  test('禁用时不可点击', async () => {
    const user = userEvent.setup()
    render(<Checkbox aria-label="禁用复选框" checked={false} disabled onCheckedChange={() => undefined} />)
    const box = screen.getByRole('checkbox', { name: '禁用复选框' })
    // Base UI 用 data-disabled / tabindex=-1 表达禁用态
    expect(box).toHaveAttribute('data-disabled', '')
    expect(box).toHaveAttribute('tabindex', '-1')
    await user.click(box).catch(() => undefined)
    expect(box.getAttribute('aria-checked')).toBe('false')
  })
})
