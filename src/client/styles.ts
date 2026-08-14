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
.dq-remaining{position:relative;cursor:help}
.dq-remaining-breakdown{display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:20;flex-direction:column;gap:4px;padding:8px 10px;background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);white-space:nowrap;font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-remaining:hover .dq-remaining-breakdown{display:flex}
.dq-remaining-granted{color:var(--dsw-alias-label-tertiary,#59636e);font-weight:400;font-size:11px}
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
.dq-status-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:20px}
.dq-status-row .dq-muted,.dq-status-row .dq-error{font-size:12px}
.dq-refresh-btn{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer}
.dq-refresh-btn:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
`
