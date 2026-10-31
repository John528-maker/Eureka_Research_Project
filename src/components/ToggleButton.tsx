interface Props {
  pressed: boolean
  onToggle: () => void
  on: string // pressed일 때 보이는 문구(누르면 끄는 동작)
  off: string
}

export default function ToggleButton({ pressed, onToggle, on, off }: Props) {
  return (
    <button type="button" className="btn" onClick={onToggle}>
      {pressed ? on : off}
    </button>
  )
}
