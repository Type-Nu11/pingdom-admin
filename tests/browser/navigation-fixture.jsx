import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AdminNavigationMenu } from '../../src/components/navigation/AdminNavigationMenu'
import { GlobalStyle } from '../../src/styles/globalStyle'
import * as Shell from '../../src/pages/place/PlaceManagePage.styles'

function Fixture() {
  const { pathname } = useLocation()
  const [generation, setGeneration] = useState(0)
  return <Shell.AppShell><GlobalStyle />
    <Shell.SideNav key={`${pathname}:${generation}`} aria-label="관리자 메뉴">
      <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
      <Shell.SideMenu data-testid="side-scroll"><AdminNavigationMenu /></Shell.SideMenu>
      <Shell.SideFooter>합성 테스트 관리자</Shell.SideFooter>
    </Shell.SideNav>
    <div style={{ marginLeft: 260, padding: 16 }}>
      <output data-testid="route">{pathname}</output>
      <button onClick={() => setGeneration(value => value + 1)}>재마운트</button>
    </div>
  </Shell.AppShell>
}
createRoot(document.getElementById('root')).render(<MemoryRouter><Fixture /></MemoryRouter>)
