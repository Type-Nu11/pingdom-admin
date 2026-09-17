import styled from 'styled-components'
import { adminColors as c } from '../../styles/theme'

export const Summary = styled.div`
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
`;
export const SummaryText = styled.div`
  min-width: 0;
  font-size: 13px;
  overflow-wrap: anywhere;
  p { margin: 6px 0 0; color: ${c.muted}; }
`;
export const ImageButton = styled.button`
  width: 80px;
  height: 80px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  &:focus-visible { outline: 2px solid ${c.primaryForeground}; outline-offset: 2px; }
`;
export const Thumbnail = styled.img`
  width: 100%; height: 100%; object-fit: cover; display: block;
`;
export const FullImage = styled.img`
  width: 100%; max-height: 65dvh; object-fit: contain;
`;
export const ImagePlaceholder = styled.div`
  width: 80px; height: 80px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  background: ${c.surfaceLow}; color: ${c.muted}; border-radius: 8px;
  font-size: 11px; text-align: center;
`;
export const Technical = styled.details`
  padding-top: 12px;
  > summary { cursor: pointer; font-size: 14px; font-weight: 700; padding: 8px 0; }
  > summary:focus-visible { outline: 2px solid ${c.primaryForeground}; outline-offset: 2px; }
`;
