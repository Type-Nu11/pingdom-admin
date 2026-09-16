import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import RolePage from '../../src/pages/userRole/UserRolePage'
import ReservationPage from '../../src/pages/adminReservationReview/AdminReservationReviewPage'
import PlacePage from '../../src/pages/place/PlaceManagePage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
const place=id=>({id,name:`합성 장소 ${id}`,address:'동명 구분용 주소',latitude:37.5,longitude:127,userId:1,category:'카페',operatingStatus:'OPERATING',discoveryStatus:'VISIBLE'})
window.qaRequests=[]
client.defaults.adapter=async config=>{
  window.qaRequests.push({url:config.url,params:config.params,method:config.method})
  if(config.method!=='get')throw new Error('Mutations forbidden')
  let data
  if(config.url==='/admin/users/role-targets')data={users:[{userId:7,username:'same_admin'},{userId:8,username:'same_admin'}],totalCount:2,totalPages:1,hasNext:false}
  else if(config.url.endsWith('/roles'))data=[]
  else if(config.url==='/admin/places')data={places:[place(1)],page:1,limit:10,totalCount:1,totalPages:1,hasNext:false}
  else if(/^\/admin\/places\/\d+$/.test(config.url))data=place(Number(config.url.split('/').at(-1)))
  else if(config.url==='/admin/reservations')data={reservations:[],items:[],page:1,totalCount:0,totalElements:0,totalPages:1,hasNext:false}
  else throw new Error(`Unexpected API ${config.url}`)
  return {config,data,status:200,statusText:'OK',headers:{}}
}
const auth={clearAuth(){},logout(){},user:{id:99,username:'synthetic',role:'ADMIN'},isAuthenticated:true,isAuthReady:true}
const notifications={notifications:[],unreadCount:0,pendingWorkItems:[],pendingWorkCount:0,status:'success',pendingWorkStatus:'success'}
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><BrowserRouter><GlobalStyle/><Routes><Route path="/roles" element={<RolePage/>}/><Route path="/reservations/review" element={<ReservationPage/>}/><Route path="/places" element={<PlacePage/>}/></Routes></BrowserRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
