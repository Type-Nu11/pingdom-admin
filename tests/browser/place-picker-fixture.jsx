import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import EventPage from '../../src/pages/placeEvent/PlaceEventPage'
import VerificationPage from '../../src/pages/placeVerification/PlaceVerificationPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
window.qaRequests=[]
const draft={eventId:1,placeId:8,placeName:'합성 장소',placeAddress:'서울 테스트 주소',title:'합성 초안',eventType:'POP_UP',publicationStatus:'DRAFT',scheduleStatus:'UPCOMING',startAt:'2030-01-01T09:00:00',endAt:'2030-01-02T09:00:00',createdAt:'2026-01-01T00:00:00',updatedAt:'2026-01-01T00:00:00'}
client.defaults.adapter=async config=>{
  window.qaRequests.push({url:config.url,params:config.params,method:config.method})
  if(config.method!=='get')throw new Error('Mutations forbidden')
  let data
  if(config.url==='/admin/places')data={places:[{id:8,name:'합성 장소',address:'서울 테스트 주소'}],totalCount:1,totalPages:1,hasNext:false}
  else if(config.url==='/admin/place-events')data={events:[draft],page:config.params.page,totalCount:21,totalPages:3,hasNext:config.params.page<3}
  else if(config.url==='/admin/place-events/1')data=draft
  else if(config.url==='/admin/place-information-reports')data={reports:[],page:1,totalCount:0,totalPages:0,hasNext:false}
  else if(config.url.endsWith('/information-evidence'))data={evidences:[]}
  else if(config.url.endsWith('/information-reverification-requests'))data={requests:[],page:1,totalCount:0,totalPages:0,hasNext:false}
  else throw new Error(`Unexpected API ${config.url}`)
  return {config,data,status:200,statusText:'OK',headers:{}}
}
const auth={clearAuth(){},logout(){},user:{id:99,username:'synthetic',role:'ADMIN'},isAuthenticated:true,isAuthReady:true}
const notifications={notifications:[],unreadCount:0,pendingWorkItems:[],pendingWorkCount:0,status:'success',pendingWorkStatus:'success'}
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><BrowserRouter><GlobalStyle/><Routes><Route path="/places/events" element={<EventPage/>}/><Route path="/verification" element={<VerificationPage/>}/></Routes></BrowserRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
