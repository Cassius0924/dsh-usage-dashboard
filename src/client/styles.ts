/** All plugin styles in one sheet, injected once at client load. */

export const css = `
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
.dsh-quota-remaining-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e);margin-bottom:2px}
.dsh-quota-total{font-size:24px;font-weight:700;color:var(--dsw-alias-label-primary,#1f2328);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.dsh-quota-currency{font-size:14px;font-weight:600;margin-left:3px;color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-row{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:12px}
.dsh-quota-label{color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-value{color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dsh-quota-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-balance{display:flex;flex-direction:column;gap:16px;padding:20px 24px 48px;max-width:860px;margin:0 auto;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-card{background:var(--dsw-alias-bg-layer-1,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:12px;padding:16px}
.dq-card-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:0 0 12px;letter-spacing:.02em}
.dq-balance-grid{display:flex;flex-wrap:wrap;gap:12px 24px}
.dq-stat{min-width:110px}
.dq-stat-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e);margin-bottom:2px}
.dq-stat-value{font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-stat-value--ok{color:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-stat-value--bad{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-runway{cursor:help;text-decoration:underline dotted var(--dsw-alias-border-l2,rgba(0,0,0,.25));text-underline-offset:4px}
.dq-remaining{position:relative;cursor:help}
.dq-remaining-breakdown{display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:20;flex-direction:column;gap:4px;padding:8px 10px;background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);white-space:nowrap;font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-remaining:hover .dq-remaining-breakdown{display:flex}
.dq-remaining-granted{color:var(--dsw-alias-label-tertiary,#59636e);font-weight:400;font-size:11px}
.dq-period-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media (max-width:620px){.dq-period-grid{grid-template-columns:1fr}}
.dq-period{background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.06));border-radius:10px;padding:12px 14px;min-width:0}
.dq-period-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
.dq-period-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e)}
.dq-period-cost{font-size:22px;font-weight:680;letter-spacing:-.01em;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;line-height:1.25}
.dq-period-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary,#59636e);margin-top:2px;font-variant-numeric:tabular-nums;line-height:1.45}
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
.dq-pricing-table{border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums;min-width:100%}
.dq-pricing-table th{text-align:left;font-weight:500;color:var(--dsw-alias-label-tertiary,#59636e);padding:4px 12px 4px 0;white-space:nowrap;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-pricing-table td{padding:4px 12px 4px 0;color:var(--dsw-alias-label-primary,#1f2328);white-space:nowrap;vertical-align:top}
.dq-pricing-table tbody tr+tr td{border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05))}
.dq-pricing-foot{margin:8px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-cache-figures{display:flex;flex-wrap:wrap;gap:12px 32px;margin-bottom:12px}
.dq-muted-value{color:var(--dsw-alias-label-secondary,#59636e)!important;font-weight:550}
.dq-stat-value--warn{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-cache-track{height:8px;border-radius:999px;background:var(--dsw-alias-state-error-primary,#cf222e);opacity:.85;overflow:hidden}
.dq-cache-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-success-primary,#2da44e);transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-cache-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:8px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-cache-legend span{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch--hit{background:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-legend-swatch--miss{background:var(--dsw-alias-state-error-primary,#cf222e);opacity:.85}
.dq-cache-foot{margin:10px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-rank{display:flex;flex-direction:column;gap:14px}
.dq-rank-row{display:flex;flex-direction:column;gap:5px;min-width:0}
.dq-rank-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dq-rank-name{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:550;color:var(--dsw-alias-label-primary,#1f2328);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-rank-cost{display:inline-flex;align-items:baseline;gap:8px;font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;flex:none}
.dq-rank-share{font-size:11px;font-weight:500;color:var(--dsw-alias-label-tertiary,#59636e);min-width:30px;text-align:right}
.dq-rank-track{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.12));overflow:hidden}
.dq-rank-fill{height:100%;border-radius:999px;transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-rank-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums;line-height:1.5}
.dq-links{display:flex;flex-wrap:wrap;gap:8px}
.dq-link{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-state-business-primary,#0969da);text-decoration:none;font-size:13px;font-weight:500;cursor:pointer}
.dq-link:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
.dq-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px}
.dq-toggle input{width:16px;height:16px;accent-color:var(--dsw-alias-state-business-primary,#0969da);cursor:pointer}
.dq-usage-totals{display:flex;flex-wrap:wrap;gap:12px 24px;margin-bottom:16px}
.dq-chart-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:18px 0 8px}
.dq-chart-title:first-of-type{margin-top:0}
.dq-chart-block-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 8px}
.dq-chart-block-head .dq-chart-title{margin:0}
.dq-chart-controls{display:flex;align-items:center;gap:8px;flex:none}
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
.dq-bar-group{display:flex;align-items:flex-end;gap:2px;height:100%;width:100%}
.dq-bar-group .dq-bar{flex:1 1 0;min-width:0}
.dq-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-legend-item{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch{width:10px;height:10px;border-radius:3px;flex:none}
.dq-chart-switch{display:inline-flex;align-items:center;gap:2px;padding:2px;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));border-radius:999px;flex:none}
.dq-chart-switch-btn{border:none;background:transparent;color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;line-height:1;padding:5px 12px;border-radius:999px;cursor:pointer;transition:background .15s ease,color .15s ease}
.dq-chart-switch-btn:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-chart-switch-btn--on{background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#1f2328);box-shadow:0 1px 3px rgba(0,0,0,.14)}
.dq-bars{display:flex;align-items:flex-end;gap:2px;width:100%}
.dq-bar-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch}
.dq-bar{background:var(--dsw-alias-state-business-primary,#4176e6);border-radius:2px 2px 0 0;min-height:1px}
.dq-bar-label{font-size:9px;color:var(--dsw-alias-label-tertiary,#59636e);text-align:center;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-heatmap{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,12px);gap:3px;width:max-content;max-width:100%}
.dq-heat-cell{width:12px;height:12px;border-radius:2px}
.dq-muted{color:var(--dsw-alias-label-secondary,#59636e)}
.dq-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-warn{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-empty{color:var(--dsw-alias-label-secondary,#59636e);font-size:12.5px;line-height:1.6;padding:6px 0}
.dq-skel{background:linear-gradient(90deg,rgba(125,135,155,.10) 25%,rgba(125,135,155,.20) 37%,rgba(125,135,155,.10) 63%);background-size:400% 100%;border-radius:5px;animation:dq-shimmer 1.5s ease-in-out infinite}
.dq-stat .dq-skel+.dq-skel{margin-top:6px}
.dq-skel-bars{display:flex;align-items:flex-end;gap:2px;width:100%;height:120px;margin-top:10px}
.dq-skel-bar{flex:1 1 0;min-width:0;border-radius:2px 2px 0 0}
@keyframes dq-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
@media (prefers-reduced-motion:reduce){.dq-skel{animation:none}.dq-refresh-icon--spin{animation:none}}
.dq-status-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:20px}
.dq-status-row .dq-muted,.dq-status-row .dq-error{font-size:12px}
.dq-refresh-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;transition:border-color .15s ease,color .15s ease}
.dq-refresh-btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
.dq-refresh-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-refresh-btn:disabled{cursor:default;opacity:.6}
.dq-refresh-icon{display:inline-block;line-height:1}
.dq-refresh-icon--spin{animation:dq-spin .9s linear infinite}
@keyframes dq-spin{to{transform:rotate(360deg)}}
`
