// dsh-usage-dashboard — Client half (function body for `cordis_define`'s `code.client`).
//
// Renders two surfaces in the DeepSeek Harness Web GUI:
//   1. A draggable floating balance widget in the bottom-right corner (`shell.overlay`).
//   2. A "额度" view tab beside 对话/轨迹 (`conversation.view`) with the full dashboard.
return {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const css = `
.dsh-quota-root{position:absolute;right:16px;bottom:16px;z-index:2147483000;pointer-events:auto;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.45;color:var(--dsw-alias-label-primary,#1f2328);transition:left .28s cubic-bezier(.22,1,.36,1),top .28s cubic-bezier(.22,1,.36,1)}
.dsh-quota-root.dsh-quota-dragging{transition:none}
.dsh-quota-card{background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:12px 14px;min-width:208px;max-width:270px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.dsh-quota-root.dsh-quota-dragging .dsh-quota-card{cursor:grabbing;box-shadow:0 12px 32px rgba(0,0,0,.28)}
.dsh-quota-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.dsh-quota-title{font-weight:600;font-size:13px;color:var(--dsw-alias-label-primary,#1f2328);display:flex;align-items:center;gap:6px}
.dsh-quota-grip{color:var(--dsw-alias-label-secondary,#59636e);opacity:.7;font-size:11px;letter-spacing:0;cursor:grab;flex:none}
.dsh-quota-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#2da44e);flex:none}
.dsh-quota-dot--error{background:var(--dsw-alias-state-error-primary,#cf222e)}
.dsh-quota-dot--idle{background:var(--dsw-alias-label-secondary,#59636e);opacity:.6}
.dsh-quota-collapsed-total{font-weight:700;font-size:13px;color:var(--dsw-alias-brand-primary,#0969da)}
.dsh-quota-actions{display:flex;gap:2px}
.dsh-quota-btn{border:none;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,#59636e);padding:3px 7px;border-radius:6px;font-size:13px;line-height:1}
.dsh-quota-btn:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#1f2328)}
.dsh-quota-body{color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-total{font-size:24px;font-weight:700;color:var(--dsw-alias-label-primary,#1f2328);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.dsh-quota-currency{font-size:14px;font-weight:600;margin-left:3px;color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-row{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:12px}
.dsh-quota-label{color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-value{color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dsh-quota-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-balance{display:flex;flex-direction:column;gap:16px;padding:20px 24px 48px;max-width:860px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-card{background:var(--dsw-alias-bg-layer-1,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:12px;padding:16px}
.dq-card-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:0 0 12px;letter-spacing:.02em}
.dq-balance-grid{display:flex;flex-wrap:wrap;gap:12px 24px}
.dq-stat{min-width:110px}
.dq-stat-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e);margin-bottom:2px}
.dq-stat-value{font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-stat-value--ok{color:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-stat-value--bad{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-links{display:flex;flex-wrap:wrap;gap:8px}
.dq-link{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-state-business-primary,#0969da);text-decoration:none;font-size:13px;font-weight:500;cursor:pointer}
.dq-link:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
.dq-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px}
.dq-toggle input{width:16px;height:16px;accent-color:var(--dsw-alias-state-business-primary,#0969da);cursor:pointer}
.dq-usage-totals{display:flex;flex-wrap:wrap;gap:12px 24px;margin-bottom:16px}
.dq-chart-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:18px 0 8px}
.dq-chart-title:first-of-type{margin-top:0}
.dq-bars{display:flex;align-items:flex-end;gap:2px;width:100%}
.dq-bar-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch}
.dq-bar{background:var(--dsw-alias-state-business-primary,#4176e6);border-radius:2px 2px 0 0;min-height:1px}
.dq-bar-label{font-size:9px;color:var(--dsw-alias-label-tertiary,#59636e);text-align:center;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-heatmap{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,12px);gap:3px;width:max-content;max-width:100%}
.dq-heat-cell{width:12px;height:12px;border-radius:2px}
.dq-muted{color:var(--dsw-alias-label-secondary,#59636e)}
.dq-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
`
    ctx.effect(() => styles.insert(css))

    const fmt = function (v) {
      const n = Number(v)
      if (!isFinite(n)) return String(v)
      return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    const fmtInt = function (v) { return Math.round(Number(v) || 0).toLocaleString() }
    const fmtCompact = function (v) {
      const n = Number(v) || 0
      if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
      if (n >= 10000) return (n / 10000).toFixed(1) + '万'
      return Math.round(n).toLocaleString()
    }

    // Shared widget-visibility store (floating widget <-> dashboard toggle).
    let widgetVisible = true
    const widgetListeners = new Set()
    const getWidgetVisible = function () { return widgetVisible }
    const setWidgetVisible = function (v) { widgetVisible = !!v; widgetListeners.forEach(function (f) { f() }) }
    const subscribeWidgetVisible = function (fn) { widgetListeners.add(fn); return function () { widgetListeners.delete(fn) } }

    const MARGIN = 16
    const getBounds = function (node) {
      if (!node) return { left: 0, top: 0, right: 100000, bottom: 100000 }
      const overlay = (typeof node.closest === 'function') ? node.closest('[data-shell-overlay]') : null
      const frame = overlay ? overlay.parentElement : null
      if (!frame) return { left: 0, top: 0, right: 100000, bottom: 100000 }
      const frameRect = frame.getBoundingClientRect()
      const sidebar = frame.children && frame.children[0]
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null
      const left = sidebarRect ? sidebarRect.right : frameRect.left
      let top = frameRect.top
      if (typeof frame.querySelector === 'function') {
        const headerAnchor = frame.querySelector('[data-slot="conversation.session.header"]')
        const headerEl = headerAnchor ? headerAnchor.firstElementChild : null
        if (headerEl) {
          const headerRect = headerEl.getBoundingClientRect()
          if (headerRect.height > 0 && headerRect.bottom > top) top = headerRect.bottom
        }
      }
      return { left: left, top: top, right: frameRect.right, bottom: frameRect.bottom }
    }
    const cornerPos = function (corner, node, bounds) {
      const rect = node.getBoundingClientRect()
      const w = rect.width; const h = rect.height
      const xLeft = bounds.left + MARGIN; const yTop = bounds.top + MARGIN
      const xRight = bounds.right - w - MARGIN; const yBottom = bounds.bottom - h - MARGIN
      if (corner === 'tl') return { x: xLeft, y: yTop }
      if (corner === 'tr') return { x: xRight, y: yTop }
      if (corner === 'bl') return { x: xLeft, y: yBottom }
      return { x: xRight, y: yBottom }
    }

    function QuotaWidget() {
      const visibleState = React.useState(getWidgetVisible())
      const visible = visibleState[0]
      const setVisible = visibleState[1]
      React.useEffect(function () { return subscribeWidgetVisible(function () { setVisible(getWidgetVisible()) }) }, [])

      const dataState = React.useState(null)
      const data = dataState[0]; const setData = dataState[1]
      const errorState = React.useState(null)
      const error = errorState[0]; const setError = errorState[1]
      const loadingState = React.useState(true)
      const loading = loadingState[0]; const setLoading = loadingState[1]
      const collapsedState = React.useState(false)
      const collapsed = collapsedState[0]; const setCollapsed = collapsedState[1]
      const posState = React.useState(null)
      const pos = posState[0]; const setPos = posState[1]
      const cornerState = React.useState('br')
      const corner = cornerState[0]; const setCorner = cornerState[1]
      const draggingState = React.useState(false)
      const dragging = draggingState[0]; const setDragging = draggingState[1]
      const rootRef = React.useRef(null)
      const dragRef = React.useRef(null)

      const fetchBalance = async function (showLoading) {
        if (showLoading) setLoading(true)
        try {
          const res = await host.call('deepseek-balance', {})
          if (res && res.ok === true) { setData(res.data); setError(null) }
          else { setData(null); setError((res && res.error) || '查询失败') }
        } catch (err) {
          setData(null); setError(String((err && err.message) || err))
        } finally { setLoading(false) }
      }

      React.useEffect(function () {
        fetchBalance(true)
        const dispose = ctx.interval(function () { void fetchBalance(false) }, 60000)
        return dispose
      }, [])

      React.useEffect(function () {
        if (pos === null) return
        const node = rootRef.current
        if (!node) return
        setPos(cornerPos(corner, node, getBounds(node)))
      }, [collapsed])

      const snapToNearest = function (d) {
        const node = rootRef.current
        if (!node) return
        const w = d.width; const h = d.height; const b = d.bounds
        const corners = [
          { c: 'tl', x: b.left + MARGIN, y: b.top + MARGIN },
          { c: 'tr', x: b.right - w - MARGIN, y: b.top + MARGIN },
          { c: 'bl', x: b.left + MARGIN, y: b.bottom - h - MARGIN },
          { c: 'br', x: b.right - w - MARGIN, y: b.bottom - h - MARGIN },
        ]
        const rect = node.getBoundingClientRect()
        const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2
        let best = corners[0]; let bestD = Infinity
        for (let i = 0; i < corners.length; i++) {
          const c = corners[i]
          const ccx = c.x + w / 2; const ccy = c.y + h / 2
          const dist = (ccx - cx) * (ccx - cx) + (ccy - cy) * (ccy - cy)
          if (dist < bestD) { bestD = dist; best = c }
        }
        setCorner(best.c); setPos({ x: best.x, y: best.y })
      }
      const endDrag = function (snap) {
        const d = dragRef.current
        if (!d) return
        dragRef.current = null
        setDragging(false)
        const node = rootRef.current
        if (node && typeof node.releasePointerCapture === 'function') { try { node.releasePointerCapture(d.pointerId) } catch (err) {} }
        if (snap) {
          if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { snapToNearest(d) })
          else snapToNearest(d)
        }
      }
      const onPointerDown = function (e) {
        if (e.button !== 0) return
        const t = e.target
        if (t && typeof t.closest === 'function' && t.closest('button')) return
        const node = rootRef.current
        if (!node) return
        const bounds = getBounds(node)
        const rect = node.getBoundingClientRect()
        dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top, width: rect.width, height: rect.height, bounds: bounds }
        if (typeof node.setPointerCapture === 'function') node.setPointerCapture(e.pointerId)
        setDragging(true)
        e.preventDefault()
      }
      const onPointerMove = function (e) {
        const d = dragRef.current
        if (!d || d.pointerId !== e.pointerId) return
        if ((e.buttons & 1) === 0) { endDrag(true); return }
        const dx = e.clientX - d.startX; const dy = e.clientY - d.startY
        const maxX = d.bounds.right - d.width - MARGIN; const maxY = d.bounds.bottom - d.height - MARGIN
        const minX = d.bounds.left + MARGIN; const minY = d.bounds.top + MARGIN
        const x = Math.max(minX, Math.min(d.originX + dx, maxX))
        const y = Math.max(minY, Math.min(d.originY + dy, maxY))
        setPos({ x: x, y: y })
      }
      const onPointerUp = function (e) { const d = dragRef.current; if (!d || d.pointerId !== e.pointerId) return; endDrag(true) }
      const onPointerCancel = function () { endDrag(false) }
      const onLostPointerCapture = function () { endDrag(false) }

      if (!visible) return null

      const primary = (data && data.balances && data.balances.length > 0) ? data.balances[0] : null
      const dotClass = primary ? (data.isAvailable === false ? 'dsh-quota-dot dsh-quota-dot--error' : 'dsh-quota-dot') : 'dsh-quota-dot dsh-quota-dot--idle'
      const title = React.createElement('div', { className: 'dsh-quota-title' },
        React.createElement('span', { className: 'dsh-quota-grip', title: '拖动以移动' }, '\u2807'),
        React.createElement('span', { className: dotClass }),
        React.createElement('span', null, 'DeepSeek 额度'),
        (collapsed && primary) ? React.createElement('span', { className: 'dsh-quota-collapsed-total' }, fmt(primary.total) + ' ' + primary.currency) : null)
      const refreshBtn = React.createElement('button', { className: 'dsh-quota-btn', type: 'button', title: '刷新', onClick: function () { void fetchBalance(true) } }, '\u21BB')
      const collapseBtn = React.createElement('button', { className: 'dsh-quota-btn', type: 'button', title: collapsed ? '展开' : '收起', onClick: function () { setCollapsed(!collapsed) } }, collapsed ? '+' : '\u2212')
      const headerRight = React.createElement('div', { className: 'dsh-quota-actions' }, refreshBtn, collapseBtn)
      let body = null
      if (!collapsed) {
        if (loading && !data && !error) body = React.createElement('div', { className: 'dsh-quota-body' }, '查询中…')
        else if (error && !data) body = React.createElement('div', { className: 'dsh-quota-body dsh-quota-error' }, error)
        else if (primary) {
          const rows = []
          rows.push(React.createElement('div', { key: 'granted', className: 'dsh-quota-row' }, React.createElement('span', { className: 'dsh-quota-label' }, '赠送额度'), React.createElement('span', { className: 'dsh-quota-value' }, fmt(primary.granted))))
          rows.push(React.createElement('div', { key: 'toppedUp', className: 'dsh-quota-row' }, React.createElement('span', { className: 'dsh-quota-label' }, '充值额度'), React.createElement('span', { className: 'dsh-quota-value' }, fmt(primary.toppedUp))))
          if (data.isAvailable === false) rows.push(React.createElement('div', { key: 'status', className: 'dsh-quota-row' }, React.createElement('span', { className: 'dsh-quota-label' }, '状态'), React.createElement('span', { className: 'dsh-quota-value dsh-quota-error' }, '不可用')))
          body = React.createElement('div', { className: 'dsh-quota-body' },
            React.createElement('div', null, React.createElement('span', { className: 'dsh-quota-total' }, fmt(primary.total)), React.createElement('span', { className: 'dsh-quota-currency' }, primary.currency)),
            rows)
        } else body = React.createElement('div', { className: 'dsh-quota-body dsh-quota-error' }, '暂无余额数据')
      }
      const card = React.createElement('div', { ref: rootRef, className: 'dsh-quota-card', title: '拖动到四个角落', onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerCancel, onLostPointerCapture: onLostPointerCapture },
        React.createElement('div', { className: 'dsh-quota-header' }, title, headerRight), body)
      const style = pos ? { left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' } : null
      return React.createElement('div', { className: 'dsh-quota-root' + (dragging ? ' dsh-quota-dragging' : ''), style: style }, card)
    }

    function Bars(props) {
      const data = props.data || []
      const height = props.height || 120
      const labelEvery = props.labelEvery || 1
      let max = 0
      for (let i = 0; i < data.length; i++) if (data[i].value > max) max = data[i].value
      const scale = max > 0 ? max : 1
      return React.createElement('div', { className: 'dq-bars', style: { height: (height + 18) + 'px' } },
        data.map(function (d, i) {
          const h = Math.max(1, Math.round((d.value / scale) * height))
          const show = i % labelEvery === 0
          return React.createElement('div', { key: i, className: 'dq-bar-col', title: d.title || (d.label + ': ' + fmtInt(d.value)) },
            React.createElement('div', { className: 'dq-bar', style: { height: h + 'px' } }),
            React.createElement('div', { className: 'dq-bar-label', style: { visibility: show ? 'visible' : 'hidden' } }, d.label))
        }))
    }

    function heatColor(level) {
      if (level <= 0) return 'rgba(120,130,150,0.12)'
      if (level === 1) return 'rgba(65,118,230,0.25)'
      if (level === 2) return 'rgba(65,118,230,0.5)'
      if (level === 3) return 'rgba(65,118,230,0.75)'
      return 'rgba(65,118,230,1)'
    }

    function Heatmap(props) {
      const data = props.data || []
      let max = 0
      for (let i = 0; i < data.length; i++) if (data[i].total > max) max = data[i].total
      let firstDow = 0
      if (data.length > 0) {
        const dt = new Date(data[0].date + 'T00:00:00')
        firstDow = isNaN(dt.getTime()) ? 0 : dt.getDay()
      }
      const cells = []
      for (let i = 0; i < firstDow; i++) cells.push(null)
      for (let i = 0; i < data.length; i++) cells.push(data[i])
      while (cells.length % 7 !== 0) cells.push(null)
      return React.createElement('div', { className: 'dq-heatmap' },
        cells.map(function (d, i) {
          if (d === null) return React.createElement('div', { key: 'p' + i, className: 'dq-heat-cell', style: { background: 'transparent' } })
          const r = max > 0 ? d.total / max : 0
          const level = d.total > 0 ? (r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4) : 0
          return React.createElement('div', { key: i, className: 'dq-heat-cell', style: { background: heatColor(level) }, title: d.date + ' · ' + fmtInt(d.total) + ' tokens · ¥' + fmt(d.cost) + ' · ' + d.calls + ' 次调用' })
        }))
    }

    function BalanceSection() {
      const balanceState = React.useState(null)
      const balance = balanceState[0]; const setBalance = balanceState[1]
      const usageState = React.useState(null)
      const usage = usageState[0]; const setUsage = usageState[1]
      const errState = React.useState(null)
      const err = errState[0]; const setErr = errState[1]
      const loadingState = React.useState(true)
      const loading = loadingState[0]; const setLoading = loadingState[1]
      const widgetOnState = React.useState(getWidgetVisible())
      const widgetOn = widgetOnState[0]; const setWidgetOn = widgetOnState[1]

      const load = async function () {
        setLoading(true); setErr(null)
        try {
          const results = await Promise.all([host.call('deepseek-balance', {}), host.call('deepseek-usage', {})])
          const b = results[0]; const u = results[1]
          if (b && b.ok) setBalance(b.data); else setBalance(null)
          if (u && u.ok) setUsage(u.data); else setUsage(null)
          if ((b && !b.ok) && (u && !u.ok)) setErr((b && b.error) || (u && u.error) || '加载失败')
        } catch (e) { setErr(String((e && e.message) || e)) }
        finally { setLoading(false) }
      }
      React.useEffect(function () { load() }, [])

      const toggle = function () { const next = !widgetOn; setWidgetOn(next); setWidgetVisible(next) }
      const primary = balance && balance.balances && balance.balances.length > 0 ? balance.balances[0] : null

      const stat = function (label, valueNode) {
        return React.createElement('div', { className: 'dq-stat' }, React.createElement('div', { className: 'dq-stat-label' }, label), valueNode)
      }
      const link = function (href, text) {
        return React.createElement('a', { className: 'dq-link', href: href, target: '_blank', rel: 'noreferrer' }, text)
      }

      const overview = React.createElement('div', { className: 'dq-card' },
        React.createElement('div', { className: 'dq-card-title' }, '账户余额'),
        primary ? React.createElement('div', { className: 'dq-balance-grid' },
          stat('总余额', React.createElement('div', { className: 'dq-stat-value' }, fmt(primary.total) + ' ' + primary.currency)),
          stat('赠送额度', React.createElement('div', { className: 'dq-stat-value' }, fmt(primary.granted))),
          stat('充值额度', React.createElement('div', { className: 'dq-stat-value' }, fmt(primary.toppedUp))),
          stat('状态', React.createElement('div', { className: 'dq-stat-value' + (balance.isAvailable === false ? ' dq-stat-value--bad' : ' dq-stat-value--ok') }, balance.isAvailable === false ? '不可用' : '可用'))
        ) : React.createElement('div', { className: 'dq-muted' }, '暂无余额数据'))

      const links = React.createElement('div', { className: 'dq-card' },
        React.createElement('div', { className: 'dq-card-title' }, '官方平台'),
        React.createElement('div', { className: 'dq-links' },
          link('https://platform.deepseek.com/usage', '查看额度 / 用量'),
          link('https://platform.deepseek.com/api_keys', '生成 API Key'),
          link('https://status.deepseek.com', '服务状态')))

      let usageBody = null
      if (usage) {
        const t = usage.totals || {}
        const dailyBars = (usage.daily || []).map(function (d) { return { label: d.date.slice(8, 10), value: d.total, title: d.date + ' · ' + fmtInt(d.total) + ' tokens · ¥' + fmt(d.cost) + ' · ' + d.calls + ' 次调用' } })
        const hourlyBars = (usage.hourly || []).map(function (h) { return { label: String(h.hour), value: h.total, title: h.hour + ' 点 · ' + fmtInt(h.total) + ' tokens · ' + h.calls + ' 次调用' } })
        usageBody = React.createElement('div', null,
          React.createElement('div', { className: 'dq-usage-totals' },
            stat('累计 tokens', React.createElement('div', { className: 'dq-stat-value' }, fmtCompact(t.total))),
            stat('消耗费用（估算）', React.createElement('div', { className: 'dq-stat-value' }, '¥ ' + fmt(t.cost))),
            stat('输入', React.createElement('div', { className: 'dq-stat-value' }, fmtCompact(t.input))),
            stat('输出', React.createElement('div', { className: 'dq-stat-value' }, fmtCompact(t.output))),
            stat('缓存命中', React.createElement('div', { className: 'dq-stat-value' }, fmtCompact(t.cache))),
            stat('模型调用', React.createElement('div', { className: 'dq-stat-value' }, fmtInt(t.calls)))),
          React.createElement('div', { className: 'dq-chart-title' }, '近 30 天 · 逐天用量'),
          React.createElement(Bars, { data: dailyBars, height: 120, labelEvery: 5 }),
          React.createElement('div', { className: 'dq-chart-title' }, '按小时分布（0–23 点）'),
          React.createElement(Bars, { data: hourlyBars, height: 100, labelEvery: 3 }),
          React.createElement('div', { className: 'dq-chart-title' }, '近 12 周 · 每日用量热力图'),
          React.createElement(Heatmap, { data: usage.heatmap || [] }))
      } else {
        usageBody = React.createElement('div', { className: 'dq-muted' }, '暂无用量数据')
      }
      const usageCard = React.createElement('div', { className: 'dq-card' },
        React.createElement('div', { className: 'dq-card-title' }, 'DSH 用量（tokens）'),
        usageBody)

      const toggleRow = React.createElement('div', { className: 'dq-card' },
        React.createElement('label', { className: 'dq-toggle' },
          React.createElement('input', { type: 'checkbox', checked: widgetOn, onChange: toggle }),
          React.createElement('span', null, '显示右下角悬浮额度窗口')))

      return React.createElement('div', { className: 'dq-balance' },
        loading ? React.createElement('div', { className: 'dq-muted' }, '加载中…') : null,
        err ? React.createElement('div', { className: 'dq-error' }, err) : null,
        overview, links, usageCard, toggleRow)
    }

    slots.inject('shell.overlay', function () { return slots.register({ name: 'shell.overlay', id: 'deepseek-quota', order: 1000, label: 'DeepSeek 额度' }, function () { return React.createElement(QuotaWidget) }) })
    slots.inject('conversation.view', function () { return slots.register({ name: 'conversation.view', id: 'balance', order: 20, label: '额度' }, function () { return React.createElement(BalanceSection) }) })
  },
}
