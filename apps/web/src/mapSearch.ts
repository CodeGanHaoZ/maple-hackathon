export type SearchPoi = { name?: string; lonlat?: string; address?: string; hotPointID?: string }
type SearchResult = { getPois(): SearchPoi[] | false; result?: { status?: { infocode?: string | number }; code?: number } }
type SearchBounds = { getSouthWest(): unknown; getNorthEast(): unknown }
type SearchMap = { getBounds(): SearchBounds; getZoom(): number }
type MapSdk = {
  LngLat: new (lng: number, lat: number) => unknown
  LngLatBounds: new (southWest: unknown, northEast: unknown) => SearchBounds
  LocalSearch: new (map: SearchMap, options: { pageCapacity: number; onSearchComplete(result: SearchResult): void }) => { searchInBounds(keyword: string, bounds: SearchBounds): void }
}

let sdkPromise: Promise<MapSdk> | undefined
const sdk = () => (window as Window & { T?: MapSdk }).T

/** 浏览器 Key 通过官方 JS SDK 检索，不调用需要服务端 Key 的 REST 接口。 */
function loadSdk(key: string): Promise<MapSdk> {
  if (sdk()?.LocalSearch) return Promise.resolve(sdk()!)
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<MapSdk>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${encodeURIComponent(key)}`
    script.async = true
    const finish = (error?: Error) => {
      clearInterval(check)
      clearTimeout(timeout)
      script.onerror = null
      if (error) { script.remove(); reject(error) } else resolve(sdk()!)
    }
    // SDK 会继续异步载入检索组件，主脚本 onload 不等于 LocalSearch 已就绪。
    const check = setInterval(() => { if (sdk()?.LocalSearch) finish() }, 100)
    const timeout = setTimeout(() => finish(new Error('地点服务加载超时')), 20000)
    script.onerror = () => finish(new Error('地点服务暂不可用'))
    document.head.append(script)
  }).catch(error => { sdkPromise = undefined; throw error })
  return sdkPromise
}

export async function createPlaceSearch(key: string, extent: readonly [number, number, number, number]) {
  const T = await loadSdk(key)
  const bounds = new T.LngLatBounds(new T.LngLat(extent[0], extent[1]), new T.LngLat(extent[2], extent[3]))
  // LocalSearch 只读取视野和级别；固定园区范围，不发送游客位置，也不创建第二张地图。
  const viewport: SearchMap = { getBounds: () => bounds, getZoom: () => 16 }
  return (keyword: string) => new Promise<SearchPoi[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('地点检索超时')), 15000)
    try {
      const search = new T.LocalSearch(viewport, { pageCapacity: 100, onSearchComplete(result) {
        clearTimeout(timer)
        const status = result.result?.status?.infocode
        if ((status && String(status) !== '1000') || result.result?.code) { reject(new Error('地点检索失败')); return }
        const pois = result.getPois()
        resolve(Array.isArray(pois) ? pois : [])
      } })
      search.searchInBounds(keyword, bounds)
    } catch { clearTimeout(timer); reject(new Error('地点检索失败')) }
  })
}
