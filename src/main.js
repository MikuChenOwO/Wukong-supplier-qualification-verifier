import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import {
  ChatDotSquare,
  ChatLineSquare,
  DataAnalysis,
  DocumentChecked,
  Files,
  Histogram,
  Monitor,
  OfficeBuilding,
  Reading,
  Setting,
  Tickets,
  UploadFilled,
  UserFilled,
} from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import './styles.css'

const app = createApp(App)

app.component('ChatDotSquare', ChatDotSquare)
app.component('ChatLineSquare', ChatLineSquare)
app.component('DataAnalysis', DataAnalysis)
app.component('DocumentChecked', DocumentChecked)
app.component('Files', Files)
app.component('Histogram', Histogram)
app.component('Monitor', Monitor)
app.component('OfficeBuilding', OfficeBuilding)
app.component('Reading', Reading)
app.component('Setting', Setting)
app.component('Tickets', Tickets)
app.component('UploadFilled', UploadFilled)
app.component('UserFilled', UserFilled)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
