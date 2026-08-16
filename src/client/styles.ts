/** All plugin styles in one sheet, injected once at client load. */

export const css = `
.dsh-quota-root{position:absolute;right:16px;bottom:16px;z-index:2147483000;pointer-events:auto;opacity:1;visibility:visible;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.45;color:var(--dsw-alias-label-primary,#1f2328);transition:left .28s cubic-bezier(.22,1,.36,1),top .28s cubic-bezier(.22,1,.36,1),opacity .16s ease-out,visibility 0s linear}
.dsh-quota-root.dsh-quota-root--dashboard{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .14s ease-out,visibility 0s linear .14s}
.dsh-quota-root.dsh-quota-dragging{transition:none}
.dsh-quota-card,.dsh-quota-card *{box-sizing:border-box}
.dsh-quota-card{background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:12px 14px;min-width:208px;max-width:270px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.dsh-quota-root.dsh-quota-dragging .dsh-quota-card{cursor:grabbing;box-shadow:0 12px 32px rgba(0,0,0,.28)}
.dsh-quota-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;min-width:0}
.dsh-quota-title{font-weight:600;font-size:13px;color:var(--dsw-alias-label-primary,#1f2328);display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}
.dsh-quota-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-quota-grip{color:var(--dsw-alias-label-secondary,#59636e);opacity:.7;font-size:11px;letter-spacing:0;cursor:grab;flex:none}
.dsh-quota-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#2da44e);flex:none}
.dsh-quota-dot--error{background:var(--dsw-alias-state-error-primary,#cf222e)}
.dsh-quota-dot--warn{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dsh-quota-total--low{color:var(--dsw-alias-state-warning-primary,#9a6700)!important}
.dsh-quota-dot--idle{background:var(--dsw-alias-label-secondary,#59636e);opacity:.6}
.dsh-quota-collapsed-total-row{margin-top:6px}
.dsh-quota-collapsed-total{font-weight:700;font-size:15px;color:var(--dsw-alias-state-business-primary,#0969da);font-variant-numeric:tabular-nums}
.dsh-quota-actions{display:flex;gap:2px;flex:none}
.dsh-quota-btn{border:none;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,#59636e);padding:3px 7px;border-radius:6px;font-size:13px;line-height:1}
.dsh-quota-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#1f2328)}
.dsh-quota-btn:active:not(:disabled){transform:scale(.92)}
.dsh-quota-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px}
.dsh-quota-btn:disabled{opacity:.5;cursor:default}
.dsh-quota-body{color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-remaining-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e);margin-bottom:2px}
.dsh-quota-total{font-size:24px;font-weight:700;color:var(--dsw-alias-label-primary,#1f2328);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.dsh-quota-currency{font-size:14px;font-weight:600;margin-left:3px;color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-row{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:12px}
.dsh-quota-label{color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-value{color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dsh-quota-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
/* 卡片间距（此处 gap）刻意大于卡内小节间距（margin-top:12/14/16px 那一档），制造"卡片外疏、卡片内密"的
   疏密对比：24px 相对卡内最大档 16px 仍有 1.5 倍级差，相对常见档 12px 有 2 倍级差，不与 .dq-card 的
   padding（16px/20px，卡片内部呼吸感，轮次 36 已定）混同。 */
.dq-balance{display:flex;flex-direction:column;gap:24px;padding:20px 24px 48px;max-width:860px;margin:0 auto;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328)}
@media (max-width:620px){.dq-balance{box-sizing:border-box;max-width:calc(100vw - 56px);padding:16px 16px calc(var(--dq-composer-h,126px) + 16px)}}
.dq-card{background:var(--dsw-alias-bg-layer-1,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:12px;padding:16px}
.dq-card-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:0 0 12px;letter-spacing:.02em}
.dq-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.dq-card-head .dq-card-title{margin:0}
.dq-card-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}
/* 主卡片（余额/当前会话消耗/消耗概览/用量趋势，轮次 45 新增「当前会话消耗」）视觉权重高于次级分析
   卡片与导航类卡片：只调排版属性——内边距、标题字号字重与取色、边框深浅——不引入新配色体系。两条规则
   与上面的基础规则同为单类选择器且源码顺序更靠后，天然覆盖，不需要 !important。次级分析卡片（用量
   热力图/高峰闲时/缓存命中/模型排行/会话排行）与导航类卡片（设置，含轮次 39 并入的官方平台链接）都不加
   这个修饰类，维持原有 .dq-card 基线，形成两档权重。「当前会话消耗」升级为主卡片的理由：它和余额一样是
   打开这个「额度」tab 时上下文最直接相关的数字（这个 tab 挂在具体会话内部，见 DESIGN_NOTES「信息层级」），
   不属于原有账户全局层级 1-3 的任何一级，而是与之正交的另一个维度，但同样是首屏必读，因此同样给
   primary 权重，不新开第三档。 */
.dq-card--primary{padding:20px;border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.12))}
.dq-card--primary .dq-card-title{font-size:13px;font-weight:700;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-window-switch{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.08))}
.dq-window-btn{border:0;border-radius:6px;padding:4px 8px;background:transparent;color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;white-space:nowrap;cursor:pointer;transition:background .15s ease,color .15s ease,box-shadow .15s ease}
.dq-window-btn:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-window-btn--on{background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#1f2328);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.dq-window-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
@media (max-width:620px){.dq-card-head{align-items:flex-start;flex-wrap:wrap}.dq-card-actions{width:100%;justify-content:space-between}}
.dq-export{position:relative;flex:none}
.dq-export-btn{min-width:58px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;transition:border-color .15s ease,color .15s ease,background .15s ease}
.dq-export-btn:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
.dq-export-btn--done{border-color:rgba(45,164,78,.35);color:var(--dsw-alias-state-success-primary,#1a7f37);background:rgba(45,164,78,.08)}
.dq-export-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:180px;padding:6px;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16);display:flex;flex-direction:column;gap:2px}
.dq-export-menu button{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;border:0;border-radius:6px;padding:7px 8px;background:transparent;color:var(--dsw-alias-label-primary,#1f2328);font-size:12px;text-align:left;cursor:pointer}
.dq-export-menu button:hover,.dq-export-menu button:focus-visible{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06))}
.dq-export-menu button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:-1px}
.dq-export-menu small{font-size:10.5px;font-weight:400;color:var(--dsw-alias-label-tertiary,#59636e);white-space:nowrap}
/* Small-text tier system (轮次 41 收敛): two whole-pixel tiers replace what used to be four values
   (11/11.5/12/12.5px) spaced only 0.5px apart — a gap browsers subpixel-round away, so it read as one
   size with extra maintenance cost, not an actual visual hierarchy. 11px = "micro" chrome the user
   scans rather than reads (dt-style stat/period labels, delta/status/coverage pills, share %, tags,
   the widget grip) — kept as-is. 12px = "secondary text" (section titles, hint/footnote/legend/sub
   prose, table cells, tooltip copy, alert/empty-state sentences, and filter/segmented-control button
   labels like .dq-window-btn/.dq-chart-switch-btn, which are the same control family and should share
   one size) — absorbed the old 11.5px and 12.5px selectors, all by rounding toward the nearer tier
   (11.5→12 grows slightly for legibility, safe because none of the affected containers are width-
   capped; 12.5→12 shrinks by 0.5px on two full-sentence blocks, imperceptible). Weight/color still do
   the job of separating titles from body text within the 12px tier, same as before this merge. Do not
   reintroduce a fractional-px value in this range; if a selector needs to stand apart from these two,
   it belongs in an already-established different tier (10px icon glyphs, 13px+ hero-adjacent text). */
.dq-balance-grid{display:flex;flex-wrap:wrap;gap:12px 24px}
.dq-stat{min-width:110px}
.dq-stat-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e);margin-bottom:2px}
.dq-stat-value{font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-stat-value--ok{color:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-stat-value--bad{color:var(--dsw-alias-state-error-primary,#cf222e)}
/* 轮次 43: .dq-runway is a controlled <details> (see dashboard.tsx) — hover/toggle state
   drives the real open attribute now, so .dq-runway-detail only needs to react to [open];
   an unopened <details>'s non-summary children don't actually render in current Chromium no
   matter what display value author CSS gives them (:hover{display:block} alone is a dead end). */
.dq-runway{position:relative}
.dq-runway>summary{display:inline-block;list-style:none;border-radius:4px;cursor:pointer;text-decoration:underline dotted var(--dsw-alias-border-l2,rgba(0,0,0,.25));text-underline-offset:4px}
.dq-runway>summary::-webkit-details-marker{display:none}
.dq-runway>summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:3px}
.dq-runway-detail{display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:20;max-width:240px;padding:8px 10px;background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);white-space:normal;font-size:12px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-runway[open] .dq-runway-detail{display:block}
/* hero number for the balance, matching .dq-period-cost; relies on cascade order (declared after
   .dq-stat-value, same specificity) to win over the .dq-stat-value it's paired with in JSX — keep it below */
.dq-remaining{position:relative;font-size:22px;font-weight:680;letter-spacing:-.01em;line-height:1.25}
.dq-remaining>summary{display:inline-block;list-style:none;border-radius:4px;cursor:pointer;text-decoration:underline dotted var(--dsw-alias-border-l2,rgba(0,0,0,.25));text-underline-offset:4px}
.dq-remaining>summary::-webkit-details-marker{display:none}
.dq-remaining>summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:3px}
.dq-remaining-breakdown{display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:20;flex-direction:column;gap:4px;padding:8px 10px;background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);white-space:nowrap;font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-remaining:hover .dq-remaining-breakdown,.dq-remaining[open] .dq-remaining-breakdown{display:flex}
.dq-remaining-granted{color:var(--dsw-alias-label-tertiary,#59636e);font-weight:400;font-size:11px}
/* narrow screens: .dq-balance-grid wraps its 3 stats onto separate lines, so the absolutely-positioned
   .dq-remaining-breakdown/.dq-runway-detail popovers can float down over whichever stat now sits in the
   next row (e.g. "余额明细" open covering "预计可用"'s clickable summary) — force each stat onto its own
   full-width row and switch both popovers to normal in-flow layout so an open one pushes its own row
   taller instead of overlaying a sibling; desktop keeps the original hover-overlay behavior unchanged */
@media (max-width:620px){
  .dq-balance-grid .dq-stat{flex:1 1 100%}
  .dq-remaining-breakdown,.dq-runway-detail{position:static;margin-top:6px;box-shadow:none;max-width:none;white-space:normal}
}
.dq-period-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0}
.dq-period{min-width:0;padding:4px 16px}
.dq-period:first-child{padding-left:0}
.dq-period:last-child{padding-right:0}
.dq-period+.dq-period{border-left:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
@media (max-width:620px){.dq-period-grid{grid-template-columns:1fr}.dq-period,.dq-period:first-child,.dq-period:last-child{padding:12px 0}.dq-period:first-child{padding-top:2px}.dq-period+.dq-period{border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-left:0}}
.dq-period-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
.dq-period-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e)}
.dq-period-cost{font-size:22px;font-weight:680;letter-spacing:-.01em;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;line-height:1.25}
.dq-period-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);margin-top:2px;font-variant-numeric:tabular-nums;line-height:1.45}
.dq-budget{margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-budget--unset{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-budget-action{border:0;background:transparent;padding:3px 4px;border-radius:5px;color:var(--dsw-alias-state-business-primary,#0969da);font:inherit;font-weight:600;white-space:nowrap;cursor:pointer}
.dq-budget-action:hover{text-decoration:underline;text-underline-offset:3px}
.dq-budget-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px}
.dq-budget-head,.dq-budget-meta{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dq-budget-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-budget-amount{font-size:12px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-budget-track{height:8px;margin-top:8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.12));overflow:hidden}
.dq-budget-fill{width:100%;height:100%;border-radius:999px;background:var(--dsw-alias-state-success-primary,#2da44e);transform-origin:left center;transition:transform .35s cubic-bezier(.22,1,.36,1)}
.dq-budget--risk .dq-budget-fill{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-budget--over .dq-budget-fill{background:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-budget-meta{margin-top:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-budget--risk .dq-budget-meta span:last-child{color:var(--dsw-alias-state-warning-primary,#9a6700);font-weight:600}
.dq-budget--over .dq-budget-meta{color:var(--dsw-alias-state-error-primary,#cf222e);font-weight:600}
@media (max-width:620px){.dq-budget-head,.dq-budget-meta,.dq-budget--unset{align-items:flex-start;flex-direction:column;gap:4px}}
.dq-delta{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:1px 6px;border-radius:999px;white-space:nowrap;cursor:help;font-variant-numeric:tabular-nums}
.dq-delta--up{color:var(--dsw-alias-state-warning-primary,#9a6700);background:rgba(191,135,0,.14)}
.dq-delta--down{color:var(--dsw-alias-state-success-primary,#1a7f37);background:rgba(45,164,78,.14)}
.dq-delta--flat,.dq-delta--new{color:var(--dsw-alias-label-tertiary,#59636e);background:rgba(120,130,150,.14);font-weight:500}
.dq-delta-label{font-weight:400;opacity:.8}
.dq-pricing{margin-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));padding-top:10px}
.dq-pricing-summary{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);cursor:pointer;list-style:none;width:fit-content;border-radius:6px;padding:2px 4px;margin-left:-4px}
.dq-pricing-summary::-webkit-details-marker{display:none}
.dq-pricing-summary::before{content:"▸";display:inline-block;font-size:10px;opacity:.7;transition:transform .15s ease}
.dq-pricing[open] .dq-pricing-summary::before{transform:rotate(90deg)}
.dq-pricing-summary:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-pricing-summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-pricing-now{font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;color:var(--dsw-alias-label-tertiary,#59636e);background:rgba(120,130,150,.14)}
.dq-pricing-now--peak{color:var(--dsw-alias-state-warning-primary,#9a6700);background:rgba(191,135,0,.14)}
.dq-pricing-body{margin-top:10px;overflow-x:auto}
.dq-pricing-table{border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;min-width:100%}
.dq-pricing-table th{text-align:left;font-weight:500;color:var(--dsw-alias-label-tertiary,#59636e);padding:4px 12px 4px 0;white-space:nowrap;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-pricing-table td{padding:4px 12px 4px 0;color:var(--dsw-alias-label-primary,#1f2328);white-space:nowrap;vertical-align:top}
.dq-pricing-table tbody tr+tr td{border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05))}
.dq-pricing-foot{margin:8px 0 0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-coverage{margin-top:16px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-coverage-summary{display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;cursor:pointer;list-style:none;width:fit-content;max-width:100%;margin-left:-4px;padding:3px 4px;border-radius:6px;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-coverage-summary::-webkit-details-marker{display:none}
.dq-coverage-summary::before{content:"▸";display:inline-block;font-size:10px;opacity:.7;transition:transform .15s ease}
.dq-coverage[open] .dq-coverage-summary::before{transform:rotate(90deg)}
.dq-coverage-summary:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-coverage-summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-coverage-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-coverage-status{padding:1px 7px;border-radius:999px;background:rgba(45,164,78,.14);color:var(--dsw-alias-state-success-primary,#1a7f37);font-size:11px;font-weight:600}
.dq-coverage--warn .dq-coverage-status{background:rgba(191,135,0,.14);color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-coverage-brief{font-size:12px;font-variant-numeric:tabular-nums}
.dq-coverage-body{margin-top:10px;padding:11px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.06))}
.dq-coverage-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 20px;margin:0}
.dq-coverage-metrics div{min-width:0}
.dq-coverage-metrics dt{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e)}
.dq-coverage-metrics dd{margin:3px 0 0;font-size:13px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-coverage-range,.dq-coverage-note,.dq-coverage-warning{margin:9px 0 0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-coverage-range{font-variant-numeric:tabular-nums}
.dq-coverage-warning{padding:8px 10px;border-radius:8px;background:rgba(191,135,0,.10);color:var(--dsw-alias-state-warning-primary,#7a5200)}
@media (max-width:620px){.dq-coverage-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.dq-coverage-brief{flex-basis:100%;margin-left:19px}}
.dq-peak-track{height:8px;border-radius:999px;background:var(--dsw-alias-state-success-primary,#2da44e);opacity:.85;overflow:hidden}
.dq-peak-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-warning-primary,#bf8700);transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-peak-legend{display:flex;flex-wrap:wrap;gap:6px 20px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-peak-legend span{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch--peak{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-legend-swatch--offpeak{background:var(--dsw-alias-state-success-primary,#2da44e);opacity:.85}
.dq-peak-figures{display:flex;flex-wrap:wrap;gap:12px 32px;margin-top:14px}
.dq-peak-delta{font-size:11px;font-weight:500;margin-left:8px;color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-peak-delta--save{color:var(--dsw-alias-state-success-primary,#1a7f37)}
.dq-peak-foot{margin:10px 0 0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-cache-figures{display:flex;flex-wrap:wrap;gap:12px 32px;margin-bottom:12px}
.dq-muted-value{color:var(--dsw-alias-label-secondary,#59636e)!important;font-weight:550}
.dq-stat-value--warn{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-cache-track{height:8px;border-radius:999px;background:var(--dsw-alias-state-warning-primary,#bf8700);overflow:hidden}
.dq-cache-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-success-primary,#2da44e);transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-cache-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-cache-legend span{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch--hit{background:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-legend-swatch--miss{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-cache-foot{margin:10px 0 0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-sessions{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}
.dq-session{display:flex;flex-direction:column;gap:5px;min-width:0}
.dq-session-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dq-session-title{font-size:13px;font-weight:550;color:var(--dsw-alias-label-primary,#1f2328);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-session-cost{font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;flex:none}
.dq-session-track{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.12));overflow:hidden}
.dq-session-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-business-primary,#4176e6);transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-session-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums;line-height:1.5}
/* The 「当前会话消耗」card uses this class on a bare <p> (no flex-gap parent
   to lean on, unlike the .dq-session usage above), so it needs its own
   explicit spacing rather than falling back to the browser's implicit <p>
   margin — this project always declares spacing explicitly. */
p.dq-session-sub{margin:8px 0}
.dq-session-foot{margin:12px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary,#59636e)}
/* 轮次 46: each ranking row is now a <details> whose <summary> wraps the existing
   head/track/sub trio unchanged (in a flex-column body div) plus a leading chevron —
   same disclosure grammar as .dq-pricing/.dq-coverage above (hidden native marker,
   rotating glyph, :focus-visible ring), just applied to a multi-line summary instead
   of a single line. .dq-session-details needs its own min-width:0 because it is now
   the flex item inside .dq-session that the ellipsis chain must shrink through. */
.dq-session-details{min-width:0}
.dq-session-details>summary{list-style:none;cursor:pointer}
.dq-session-details>summary::-webkit-details-marker{display:none}
.dq-session-summary{display:flex;align-items:flex-start;gap:8px;border-radius:8px;padding:4px;margin:-4px}
.dq-session-summary:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05))}
.dq-session-summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-session-chevron{flex:none;width:12px;margin-top:4px;font-size:10px;line-height:1;color:var(--dsw-alias-label-tertiary,#59636e);transition:transform .15s ease}
.dq-session-details[open] .dq-session-chevron{transform:rotate(90deg)}
.dq-session-summary-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
/* Expanded body reuses the same shaded-inset language as .dq-coverage-body (10px
   gap from the summary, 11px/12px padding, 10px radius, bg-layer-2) rather than
   inventing a new "nested panel" look. SessionUsageCard renders inside unchanged. */
.dq-session-expand{margin-top:10px;padding:11px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.06))}
.dq-rank{display:flex;flex-direction:column;gap:14px}
.dq-rank-row{display:flex;flex-direction:column;gap:5px;min-width:0}
.dq-rank-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dq-rank-name{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:550;color:var(--dsw-alias-label-primary,#1f2328);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-rank-cost{display:inline-flex;align-items:baseline;gap:8px;font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;flex:none}
.dq-rank-share{font-size:11px;font-weight:500;color:var(--dsw-alias-label-tertiary,#59636e);min-width:30px;text-align:right}
.dq-rank-track{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.12));overflow:hidden}
.dq-rank-fill{height:100%;border-radius:999px;transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-rank-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums;line-height:1.5}
.dq-alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:10px;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-warning-primary,#7a5200);background:rgba(191,135,0,.12);border:1px solid rgba(191,135,0,.35)}
.dq-alert-icon{flex:none;width:18px;height:18px;border-radius:50%;background:var(--dsw-alias-state-warning-primary,#bf8700);color:#fff;font-weight:700;font-size:12px;line-height:18px;text-align:center}
.dq-alert strong{font-weight:650}
.dq-alert-link{margin-left:8px;color:inherit;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
.dq-setting{display:flex;align-items:flex-start;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-setting-label{font-size:13px;color:var(--dsw-alias-label-primary,#1f2328);padding-top:6px;flex:none}
.dq-setting-control{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
.dq-setting-hint{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);line-height:1.5}
.dq-number{width:82px;padding:5px 8px;font-size:13px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-number:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;border-color:transparent}
.dq-links-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328);margin:0 0 8px}
.dq-links{display:flex;flex-wrap:wrap;gap:8px}
.dq-link{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-state-business-primary,#0969da);text-decoration:none;font-size:13px;font-weight:500;cursor:pointer}
.dq-link:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
/* .dq-toggle is the first settings control after the links row (轮次 39 merge) — its own
   border-top separates the "快捷入口" links (originally the standalone 官方平台 card, renamed
   in 轮次 39 fix-round-1 to read as part of 设置's own navigation area) from 设置 controls
   inside the merged card, same 14px/14px/border-l1 recipe as .dq-setting so the two
   sub-sections read at equal weight. */
.dq-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;margin-top:14px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-toggle input{width:16px;height:16px;accent-color:var(--dsw-alias-state-business-primary,#0969da);cursor:pointer}
.dq-toggle-hint{margin:5px 0 0 26px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-toggle input:focus-visible,.dq-model-item input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-link:focus-visible,.dq-model-btn:focus-visible,.dq-chart-switch-btn:focus-visible,.dq-export-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-usage-totals{display:flex;flex-wrap:wrap;gap:12px 24px;margin-bottom:16px}
/* value itself (number+unit, e.g. "9999.9万") must never break across lines inside its own column —
   nowrap+ellipsis is a defensive floor for all widths; the actual fix for the realistic 320px 2-col
   case is the font-size drop below, which keeps every measured stress value comfortably under the
   83px column width without ever hitting the ellipsis fallback (see round 38 PROGRESS entry) */
.dq-usage-totals .dq-stat-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:620px){.dq-usage-totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}.dq-usage-totals .dq-stat{min-width:0}.dq-usage-totals .dq-stat-value{font-size:13px}}
.dq-chart-peak{margin-left:10px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary,#59636e);font-variant-numeric:tabular-nums}
.dq-chart-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:16px 0 8px}
.dq-chart-title:first-of-type{margin-top:0}
.dq-chart-block-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0 8px}
.dq-chart-block-head .dq-chart-title{margin:0}
.dq-chart-controls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;flex-wrap:wrap}
@media (max-width:620px){.dq-chart-block-head{align-items:flex-start;flex-direction:column}.dq-chart-controls{width:100%}}
.dq-model-picker{position:relative}
.dq-model-btn{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.dq-model-btn:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
.dq-model-btn::after{content:"▾";font-size:10px;opacity:.7}
.dq-model-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:190px;max-height:280px;overflow-y:auto;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:6px;display:flex;flex-direction:column;gap:2px}
.dq-model-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-model-item:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06))}
.dq-model-item input{width:14px;height:14px;accent-color:var(--dsw-alias-state-business-primary,#0969da);cursor:pointer;flex:none}
.dq-model-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-model-item--all{border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));padding-bottom:8px;margin-bottom:2px;border-radius:6px}
.dq-model-tag{color:var(--dsw-alias-label-tertiary,#59636e);font-size:11px;flex:none}
.dq-bar-group{display:flex;flex-direction:column-reverse;width:100%}
.dq-bar-group .dq-bar{flex:0 0 auto;width:100%;border-radius:0}
.dq-bar-group .dq-bar:first-child{border-radius:0 0 2px 2px}
.dq-bar-group .dq-bar:last-child{border-radius:2px 2px 0 0}
.dq-bar-group .dq-bar:not(:last-child){box-shadow:inset 0 1px 0 rgba(0,0,0,.18)}
.dq-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-legend-item{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch{width:10px;height:10px;border-radius:3px;flex:none}
.dq-chart-switch{display:inline-flex;align-items:center;gap:2px;padding:2px;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));border-radius:999px;flex:none}
.dq-chart-switch-btn{border:none;background:transparent;color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;line-height:1;padding:5px 12px;border-radius:999px;cursor:pointer;transition:background .15s ease,color .15s ease}
.dq-chart-switch-btn:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-chart-switch-btn--on{background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#1f2328);box-shadow:0 1px 3px rgba(0,0,0,.14)}
.dq-chart-wrap{position:relative}
.dq-bars-scroll{overflow-x:auto;overflow-y:hidden;padding-bottom:2px}
.dq-tip{position:absolute;transform:translate(-50%,14px);z-index:40;pointer-events:none;background:var(--dsw-alias-bg-inverse,#1f2328);color:var(--dsw-alias-label-inverse,#fff);border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.55;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.28);font-variant-numeric:tabular-nums}
.dq-tip--above{transform:translate(-50%,calc(-100% - 8px))}
.dq-tip-head{font-weight:650;margin-bottom:2px}
.dq-tip-row{opacity:.85}
.dq-bars{display:flex;align-items:flex-end;gap:2px;width:100%}
.dq-bar-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch}
.dq-bar{background:var(--dsw-alias-state-business-primary,#4176e6);border-radius:2px 2px 0 0;min-height:1px;transition:filter .12s ease}
.dq-bar-col{cursor:default}
.dq-bar-col,.dq-bar,.dq-heat-cell{scroll-margin-block-start:24px;scroll-margin-block-end:160px}
.dq-bar-col:hover .dq-bar{filter:brightness(1.18) saturate(1.1)}
.dq-bar-col:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:-2px;border-radius:3px}
.dq-bar:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;filter:brightness(1.18) saturate(1.1);position:relative;z-index:2}
.dq-bar-col--pinned{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:-2px;border-radius:3px}
.dq-bar-col--pinned .dq-bar{filter:brightness(1.18) saturate(1.1)}
.dq-bar--pinned{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;filter:brightness(1.18) saturate(1.1);position:relative;z-index:2}
.dq-heat-cell:not(.dq-heat-cell--pad):hover{outline:1.5px solid var(--dsw-alias-label-primary,#1f2328);outline-offset:1px}
.dq-heat-cell:not(.dq-heat-cell--pad):focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;position:relative;z-index:2}
.dq-heat-cell--pinned{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;position:relative;z-index:2}
.dq-bar-label{font-size:9px;color:var(--dsw-alias-label-tertiary,#59636e);text-align:center;margin-top:3px;overflow:visible;white-space:nowrap}
.dq-heat{display:flex;flex-direction:column;gap:8px;max-width:100%}
.dq-heat-scroll{overflow-x:auto;padding-bottom:2px}
.dq-heatmap{display:flex;gap:3px}
.dq-heat-week{display:flex;flex:1 1 0;min-width:6px;flex-direction:column;gap:3px}
.dq-heat-cell{width:100%;aspect-ratio:1/1;border-radius:3px;flex:none}
.dq-heat-cell--pad{background:transparent}
.dq-heat-months{display:flex;gap:3px;margin-top:4px}
.dq-heat-month{flex:1 1 0;min-width:6px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary,#59636e);white-space:nowrap;overflow:visible}
.dq-heat-key{width:12px;height:12px;border-radius:2px;flex:none}
.dq-heat-scale{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--dsw-alias-label-tertiary,#59636e);align-self:flex-end}
.dq-heat-scale>span:first-child{margin-right:2px}
.dq-heat-scale>span:last-child{margin-left:2px}
.dq-muted{color:var(--dsw-alias-label-secondary,#59636e)}
.dq-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-warn{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-crash{margin:10px 0 14px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.10));border-radius:8px;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-error-primary,#cf222e);white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.dq-empty{color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;line-height:1.6;padding:6px 0}
/* Error-state modifier for a card body that has nothing else to show (mirrors the .dq-stat-value--ok/
   --bad/--warn pattern: same layout as .dq-empty, declared after it so this color wins at equal
   specificity). Used by the current-session card when its own fetch failed and there is no prior
   data to fall back to — the status-row .dq-error/.dq-warn spans are for the account-wide balance/
   usage fetch, this is the per-card equivalent. */
.dq-empty--error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-skel{background:linear-gradient(90deg,rgba(125,135,155,.10) 25%,rgba(125,135,155,.20) 37%,rgba(125,135,155,.10) 63%);background-size:400% 100%;border-radius:5px;animation:dq-shimmer 1.5s ease-in-out infinite}
.dq-stat .dq-skel+.dq-skel{margin-top:6px}
.dq-skel-bars{display:flex;align-items:flex-end;gap:2px;width:100%;height:120px;margin-top:10px}
.dq-skel-bar{flex:1 1 0;min-width:0;border-radius:2px 2px 0 0}
@keyframes dq-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
.dq-status-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:20px}
.dq-status-messages{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}
.dq-status-row .dq-warn,.dq-status-row .dq-error{font-size:12px;line-height:1.45}
.dq-sync{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-sync-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary,#8c959f)}
.dq-sync--fresh .dq-sync-dot{background:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-sync--syncing .dq-sync-dot{background:var(--dsw-alias-state-business-primary,#4176e6);animation:dq-sync-pulse 1.2s ease-in-out infinite}
.dq-sync--fallback{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-sync--fallback .dq-sync-dot{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-sync--error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-sync--error .dq-sync-dot{background:var(--dsw-alias-state-error-primary,#cf222e)}
@keyframes dq-sync-pulse{50%{opacity:.35;transform:scale(.8)}}
.dq-refresh-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;transition:border-color .15s ease,color .15s ease}
.dq-refresh-btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
.dq-refresh-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-refresh-btn:disabled{cursor:default;opacity:.6}
.dq-refresh-icon{display:inline-block;line-height:1}
.dq-refresh-icon--spin{animation:dq-spin .9s linear infinite}
@keyframes dq-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .dsh-quota-root,.dsh-quota-root *,
  .dsh-quota-root *::before,.dsh-quota-root *::after,
  .dq-balance,.dq-balance *,
  .dq-balance *::before,.dq-balance *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
}
`
