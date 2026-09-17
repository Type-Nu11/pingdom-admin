import { useCallback, useState } from 'react'
import { getCommunityPosts, getCommunityPost, getCommunityComments, getCommunityComment } from '../../api/adminCommunityApi'
import { useCommunityQuery } from '../../hooks/useCommunityQuery'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { ListDetailWorkspace } from '../../components/common/ListDetailWorkspace'
import { ListPane } from '../../components/common/ListPane'
import { CommunityShell, CommunityContentView, CommunityPagination, QueryMessage } from './CommunityShared'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import * as S from './Community.styles'

// AdminSelect reads direct option children, so use the array rather than an option component.
const hiddenOptions = [<option key="all" value="">전체</option>, <option key="visible" value="false">공개</option>, <option key="hidden" value="true">숨김</option>]

function Comments({ postId }: { postId: number }) {
  const [hidden, setHidden] = useState('')
  const [page, setPage] = useState(1)
  const [commentId, setCommentId] = useState<number | null>(null)
  const load = useCallback((signal: AbortSignal) => getCommunityComments(postId, { page, hidden: hidden ? hidden === 'true' : undefined }, signal), [postId, page, hidden])
  const query = useCommunityQuery(`comments:${postId}:${hidden}:${page}`, load)
  const loadDetail = useCallback((signal: AbortSignal) => getCommunityComment(postId, commentId!, signal), [postId, commentId])
  const detail = useCommunityQuery(commentId === null ? null : `comment:${postId}:${commentId}`, loadDetail)
  return <S.Body>
    <Form.SectionTitle>댓글 {query.data ? `· ${query.data.totalCount}건` : ''}</Form.SectionTitle>
    <AdminSelect aria-label="댓글 노출 상태" value={hidden} onChange={e => { setHidden(e.target.value); setPage(1); setCommentId(null) }}>{hiddenOptions}</AdminSelect>
    <QueryMessage {...query} empty={query.data?.comments.length === 0} onRetry={query.refresh} />
    {query.data?.comments.map(comment => <Form.RecordButton key={comment.commentId} $selected={commentId === comment.commentId} onClick={() => setCommentId(comment.commentId)}>
      <Form.RecordTitle>댓글 #{comment.commentId} · {comment.hidden ? '숨김' : '공개'}</Form.RecordTitle>
      <Form.RecordMeta>{comment.authorUsername || '이름 없음'} · #{comment.authorUserId}</Form.RecordMeta><Form.RecordSummary>{comment.content}</Form.RecordSummary>
    </Form.RecordButton>)}
    <CommunityPagination data={query.data} page={page} onChange={p => { setPage(p); setCommentId(null) }} label="댓글 페이지네이션" />
    <QueryMessage {...detail} onRetry={detail.refresh} />
    {detail.data && detail.data.postId === postId && detail.data.commentId === commentId ? <section aria-label="댓글 상세"><CommunityContentView content={detail.data} /></section> : null}
  </S.Body>
}

export default function CommunityContentPage() {
  const [category, setCategory] = useState('')
  const [hidden, setHidden] = useState('')
  const [filters, setFilters] = useState({ categoryId: '', hidden: '' })
  const [page, setPage] = useState(1)
  const [postId, setPostId] = useState<number | null>(null)
  const load = useCallback((signal: AbortSignal) => getCommunityPosts({ page, categoryId: filters.categoryId || undefined, hidden: filters.hidden ? filters.hidden === 'true' : undefined }, signal), [page, filters])
  const query = useCommunityQuery(JSON.stringify({ page, filters }), load)
  const loadDetail = useCallback((signal: AbortSignal) => getCommunityPost(postId!, signal), [postId])
  const detail = useCommunityQuery(postId === null ? null : `post:${postId}`, loadDetail)
  return <CommunityShell title="커뮤니티 조회">
    <Shared.PageHeader><div><Shared.PageTitle>커뮤니티 글·댓글</Shared.PageTitle><Shared.PageDescription>현행 커뮤니티 원문과 숨김 상태를 조회합니다. 삭제·숨김 복원 기능은 제공하지 않습니다.</Shared.PageDescription></div></Shared.PageHeader>
    <S.Filters onSubmit={e => { e.preventDefault(); setFilters({ categoryId: category.trim(), hidden }); setPage(1); setPostId(null) }}>
      <Form.Field>카테고리 ID<Form.Input value={category} onChange={e => setCategory(e.target.value)} placeholder="전체" /></Form.Field>
      <Form.Field>노출 상태<AdminSelect aria-label="글 노출 상태" value={hidden} onChange={e => setHidden(e.target.value)}>{hiddenOptions}</AdminSelect></Form.Field>
      <Shared.PrimaryButton type="submit">조회</Shared.PrimaryButton>
      <Shared.SecondaryButton type="button" onClick={() => { setCategory(''); setHidden(''); setFilters({ categoryId: '', hidden: '' }); setPage(1); setPostId(null) }}>초기화</Shared.SecondaryButton>
      <Shared.SecondaryButton type="button" disabled={query.loading} onClick={() => { setPostId(null); void query.refresh() }}>새로고침</Shared.SecondaryButton>
    </S.Filters>
    <ListDetailWorkspace>
      <ListPane title="글 목록" count={query.data ? `${query.data.totalCount}건` : undefined} page={page} footer={<CommunityPagination data={query.data} page={page} label="글 페이지네이션" onChange={p => { setPage(p); setPostId(null) }} />}>
        <QueryMessage {...query} empty={query.data?.posts.length === 0} onRetry={query.refresh} />
        <Form.CardList>{query.data?.posts.map(post => <Form.RecordButton key={post.postId} $selected={postId === post.postId} onClick={() => setPostId(post.postId)}><Form.RecordTitle>{post.title}</Form.RecordTitle><Form.RecordMeta>글 #{post.postId} · {post.authorUsername || '이름 없음'} · {post.hidden ? '숨김' : '공개'} · {post.categoryId}</Form.RecordMeta></Form.RecordButton>)}</Form.CardList>
      </ListPane>
      <ListPane title="글·댓글 상세">
        {postId === null ? <S.Body>글을 선택해주세요.</S.Body> : null}
        <QueryMessage {...detail} onRetry={detail.refresh} />
        {detail.data && detail.data.postId === postId ? <><CommunityContentView content={detail.data} /><Comments key={postId} postId={postId} /></> : null}
      </ListPane>
    </ListDetailWorkspace>
  </CommunityShell>
}
