import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './components/Home'
import { SplitPdf } from './tools/SplitPdf'
import { MergePdf } from './tools/MergePdf'
import { CompressPdf } from './tools/CompressPdf'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="split" element={<SplitPdf />} />
          <Route path="merge" element={<MergePdf />} />
          <Route path="compress" element={<CompressPdf />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
