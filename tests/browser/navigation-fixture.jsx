import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AdminNavigationMenu } from '../../src/components/navigation/AdminNavigationMenu'
import { MerchantNavigationMenu } from '../../src/components/navigation/MerchantNavigationMenu'
import { beginLoginAttempt } from '../../src/utils/authStorage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import * as Shell from '../../src/pages/place/PlaceManagePage.styles'
import * as Dashboard from '../../src/pages/dashboard/DashboardPage.styles'
import * as Merchant from '../../src/app/router/MerchantLayout.styles'

const merchantMode = new URLSearchParams(window.location.search).get('mode') === 'merchant'
function Fixture() {
  const { pathname } = useLocation()
  const [generation, setGeneration] = useState(0)
  if (merchantMode) return <Merchant.AppShell><GlobalStyle />
    <Merchant.SideNav key={generation} aria-label="상점주 메뉴">
      <Merchant.SideHeader><Merchant.BrandLockup to="/merchant"><Merchant.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Merchant.BrandLockup></Merchant.SideHeader>
      <Merchant.SideMenu data-testid="side-scroll" data-generation={generation}><MerchantNavigationMenu /></Merchant.SideMenu>
      <Merchant.SideFooter>합성 테스트 상점주</Merchant.SideFooter>
    </Merchant.SideNav>
    <div style={{ marginLeft: 260, padding: 16 }}>
      <output data-testid="route">{pathname}</output>
      <button onClick={() => setGeneration(value => value + 1)}>재마운트</button>
      <button onClick={() => { beginLoginAttempt(); setGeneration(value => value + 1) }}>새 로그인</button>
    </div>
  </Merchant.AppShell>
  return <Shell.AppShell><GlobalStyle />
    <Shell.SideNav key={`${pathname}:${generation}`} aria-label="관리자 메뉴">
      <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
      <Shell.SideMenu data-testid="side-scroll" data-generation={generation}><AdminNavigationMenu /></Shell.SideMenu>
      <Shell.SideFooter>합성 테스트 관리자</Shell.SideFooter>
    </Shell.SideNav>
    <div style={{ marginLeft: 260, padding: 16 }}>
      <output data-testid="route">{pathname}</output>
      <button onClick={() => setGeneration(value => value + 1)}>재마운트</button>
      <button onClick={() => { beginLoginAttempt(); setGeneration(value => value + 1) }}>새 로그인</button>
      <div data-testid="dashboard-logo"><Dashboard.BrandLockup><Dashboard.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Dashboard.BrandLockup></div>
      <div data-testid="merchant-logo"><Merchant.BrandLockup to="/merchant"><Merchant.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Merchant.BrandLockup></div>
    </div>
  </Shell.AppShell>
}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[merchantMode ? '/merchant/payments' : '/']}><Fixture /></MemoryRouter>)
