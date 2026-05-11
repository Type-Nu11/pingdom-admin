import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

type FeedbackTone = 'error' | 'success'

const buttonStyle = css`
  border: 0;
  border-radius: 8px;
  font-weight: 600;

  &:disabled {
    opacity: 0.72;
  }
`

export const Page = styled.main`
  min-height: 100vh;
  padding: 32px 24px;
  background: #f9fafb;
`

export const Container = styled.div`
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
`

export const HeaderTitle = styled.h1`
  margin: 0 0 8px;
`

export const Description = styled.p`
  margin: 0;
  color: #6b7280;
`

export const NavLink = styled(Link)`
  color: #2563eb;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`

export const Card = styled.section`
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
`

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
`

export const SectionTitle = styled.h2`
  margin: 0 0 16px;
  font-size: 20px;
`

export const InlineSectionTitle = styled.h2`
  margin: 0;
  font-size: 20px;
`

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const TextInput = styled.input`
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;

  &:disabled {
    background: #f3f4f6;
  }
`

export const FieldErrorText = styled.p`
  margin: 0;
  color: #dc2626;
  font-size: 14px;
`

export const FeedbackText = styled.p<{ $tone: FeedbackTone }>`
  margin: 0;
  padding: 12px;
  border-radius: 8px;

  ${({ $tone }) =>
    $tone === 'error'
      ? css`
          background: #fef2f2;
          color: #b91c1c;
        `
      : css`
          background: #ecfdf5;
          color: #047857;
        `}
`

export const DefinitionList = styled.dl`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  margin: 0;
`

export const Term = styled.dt`
  color: #6b7280;
`

export const DescriptionValue = styled.dd`
  margin: 0;
`

export const PrimaryButton = styled.button<{ $isLoading?: boolean }>`
  ${buttonStyle}
  padding: 12px;
  background: #2563eb;
  color: #ffffff;
  cursor: ${({ $isLoading }) => ($isLoading ? 'default' : 'pointer')};
`

export const SecondaryButton = styled.button<{ $isLoading?: boolean }>`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  cursor: ${({ $isLoading }) => ($isLoading ? 'default' : 'pointer')};
`
