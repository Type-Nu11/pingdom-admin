import { Fragment, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AssistantTransportError, sendAssistantMessage } from '../api/assistantApi'
import { CHAT_INPUT_LIMIT, ChatProtocolError, prepareUserText, runChatTurn, type ChatTurn } from '../model/chatProtocol'
import { executeAssistantTool, getAssistantMenu, getAssistantPrompt, getAssistantTools, type AssistantDetail, type AssistantRole } from '../model/assistantTools'
import * as S from './PingDomAssistant.styles'

const examples = {
  ADMIN: ['심사 대기 몇 건이야?', '이 신청 요약해줘', '커뮤니티 신고 화면 열어줘'],
  MERCHANT_OWNER: ['승인 대기 예약 몇 건이야?', '이 예약 요약해줘', '쿠폰은 어디서 만들어?'],
}

function errorCopy(error: unknown) {
  if (error instanceof ChatProtocolError) {
    if (error.code === 'sensitive') return '연락처, 이메일, 인증 정보는 빼고 다시 보내주세요.'
    if (error.code === 'input') return '질문을 500자 이내로 입력해주세요.'
    if (error.code === 'limit') return '한 번에 확인할 수 있는 범위를 넘었어요. 질문을 나눠 다시 보내주세요.'
    return '답변 형식이 올바르지 않아 표시하지 못했어요. 질문을 다시 보내주세요.'
  }
  if (error instanceof AssistantTransportError) return {
    session: '로그인 상태를 확인한 뒤 다시 시도해주세요.',
    forbidden: '핑덤 AI를 사용할 권한이 없어요.',
    rate: '요청이 많아요. 잠시 후 다시 시도해주세요.',
    unavailable: '지금은 핑덤 AI에 연결할 수 없어요. 잠시 후 다시 시도해주세요.',
    timeout: '응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.',
    network: '답변을 받지 못했어요. 연결을 확인하고 다시 시도해주세요.',
  }[error.code]
  return '답변을 받지 못했어요. 잠시 후 다시 시도해주세요.'
}

export function PingDomAssistant({ role, selectedPlaceId, readDetail }: {
  role: AssistantRole; selectedPlaceId: number | null; readDetail: () => AssistantDetail | null
}) {
  const [history, setHistory] = useState<(ChatTurn & { id: number })[]>([])
  const [draft, setDraft] = useState('')
  const [pendingText, setPendingText] = useState('')
  const [error, setError] = useState('')
  const inFlight = useRef<AbortController | null>(null)
  const sequence = useRef(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const id = useId()
  const titleId = `${id}-title`
  const inputId = `${id}-input`
  const hintId = `${id}-hint`

  useLayoutEffect(() => () => { inFlight.current?.abort(); inFlight.current = null }, [])
  useLayoutEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight
  }, [history, pendingText, error])

  function cancel() {
    inFlight.current?.abort()
    inFlight.current = null
    setPendingText('')
  }

  function dismiss() {
    cancel()
    dialog.current?.close()
  }

  async function submit(value: string) {
    if (inFlight.current) return
    let text: string
    try { text = prepareUserText(value) } catch (error) { setError(errorCopy(error)); return }
    const turn = new AbortController()
    const detail = readDetail()
    inFlight.current = turn
    setError('')
    setPendingText(text)
    try {
      const answer = await runChatTurn({
        history, userText: text, system: getAssistantPrompt(role), tools: getAssistantTools(role),
        signal: turn.signal, send: sendAssistantMessage,
        execute: (tool, input, signal) => executeAssistantTool({ role, selectedPlaceId, detail, tool, input, signal }),
      })
      if (inFlight.current !== turn) return
      const id = ++sequence.current
      setHistory(previous => [...previous.slice(-9), { ...answer, id }])
      setDraft('')
    } catch (error) {
      if (inFlight.current === turn) setError(errorCopy(error))
    } finally {
      if (inFlight.current === turn) { inFlight.current = null; setPendingText('') }
    }
  }

  return <>
    <S.Launcher type="button" aria-haspopup="dialog" aria-controls={id} onClick={() => {
      dialog.current?.showModal()
      textarea.current?.focus()
    }}>핑덤 AI</S.Launcher>
    <S.Dialog id={id} ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); dismiss() }}>
      <S.Header>
        <h2 id={titleId}>핑덤 AI</h2>
        <S.Actions>
          <S.Button type="button" onClick={() => { cancel(); setHistory([]); setDraft(''); setError(''); textarea.current?.focus() }}>새 대화</S.Button>
          <S.Button type="button" aria-label="핑덤 AI 닫기" onClick={dismiss}>닫기</S.Button>
        </S.Actions>
      </S.Header>
      <S.Transcript ref={transcript} role="log" aria-label="핑덤 AI 대화">
        {!history.length && <S.Line>
          <p>업무 현황을 확인하거나 필요한 메뉴를 찾아드릴게요.</p>
          <S.Actions>{examples[role].map(example => <S.Button type="button" key={example} disabled={Boolean(pendingText)}
            onClick={() => { setDraft(example); textarea.current?.focus() }}>{example}</S.Button>)}</S.Actions>
        </S.Line>}
        {history.map(turn => <Fragment key={turn.id}>
          <S.Line $user>
            <p>{typeof turn.messages[0].content === 'string' ? turn.messages[0].content : ''}</p>
          </S.Line>
          <S.Line>
            <p>{turn.text}</p>
            {turn.facts.length > 0 && <dl>{turn.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
            {turn.targets.map(key => {
              const menu = getAssistantMenu(role, key)
              return menu && <Link key={key} to={menu.path} onClick={dismiss}>{menu.label} 열기</Link>
            })}
          </S.Line>
        </Fragment>)}
        {pendingText && <><S.Line $user><p>{pendingText}</p></S.Line><S.Hints role="status">답변을 준비하고 있어요.</S.Hints></>}
        {error && <S.ErrorText role="alert">{error}</S.ErrorText>}
      </S.Transcript>
      <S.Form onSubmit={event => { event.preventDefault(); void submit(draft) }}>
        <label htmlFor={inputId}>질문</label>
        <textarea ref={textarea} id={inputId} aria-describedby={hintId} maxLength={CHAT_INPUT_LIMIT} rows={2}
          value={draft} onChange={event => setDraft(event.target.value)} readOnly={Boolean(pendingText)}
          placeholder="예: 처리 대기 업무 알려줘" />
        {pendingText
          ? <S.Button type="button" onClick={() => { cancel(); textarea.current?.focus() }}>요청 취소</S.Button>
          : <S.Button type="submit" disabled={!draft.trim()}>보내기</S.Button>}
        <S.Hints id={hintId}>질문과 조회에 필요한 일부 정보가 AI로 전송됩니다. 개인정보는 입력하지 마세요.</S.Hints>
      </S.Form>
    </S.Dialog>
  </>
}
