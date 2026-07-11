'use client'

import { useEffect, useRef } from 'react'
import type { SaleDetail } from '@/lib/data/sale-detail-types'
import { PAYMENT_METHOD_LABELS } from '@/lib/data/balance-types'
import { formatCurrency } from '@/lib/utils/money'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/styles/catalyst-ui-kit/dialog'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface SaleReceiptDialogProps {
  open: boolean
  sale: SaleDetail | null
  organizationName: string
  autoPrint?: boolean
  onClose: () => void
}

function formatReceiptDateTime (value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

export function SaleReceiptDialog ({
  open,
  sale,
  organizationName,
  autoPrint = false,
  onClose,
}: SaleReceiptDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const hasAutoPrintedRef = useRef(false)

  function handlePrint () {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=420,height=720')
    if (!printWindow) return

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante ${sale?.displayNumber ?? ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #18181b;
      padding: 16px;
      font-size: 12px;
      line-height: 1.4;
    }
    .ticket { width: 280px; margin: 0 auto; }
    .center { text-align: center; }
    .muted { color: #71717a; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; }
    .divider { border-top: 1px dashed #a1a1aa; margin: 12px 0; }
    .title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .total { font-size: 16px; font-weight: 700; }
    .line-name { flex: 1; min-width: 0; }
    .line-qty { white-space: nowrap; color: #71717a; }
    .line-total { white-space: nowrap; font-weight: 600; }
    @media print {
      body { padding: 0; }
      .ticket { width: 100%; }
    }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  useEffect(() => {
    if (!open) {
      hasAutoPrintedRef.current = false
      return
    }

    if (!autoPrint || !sale || hasAutoPrintedRef.current) return

    hasAutoPrintedRef.current = true
    const timeoutId = window.setTimeout(() => {
      const content = printRef.current
      if (!content) return

      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=420,height=720')
      if (!printWindow) return

      printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante ${sale.displayNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #18181b;
      padding: 16px;
      font-size: 12px;
      line-height: 1.4;
    }
    .ticket { width: 280px; margin: 0 auto; }
    .center { text-align: center; }
    .muted { color: #71717a; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; }
    .divider { border-top: 1px dashed #a1a1aa; margin: 12px 0; }
    .title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .total { font-size: 16px; font-weight: 700; }
    .line-name { flex: 1; min-width: 0; }
    .line-qty { white-space: nowrap; color: #71717a; }
    .line-total { white-space: nowrap; font-weight: 600; }
    @media print {
      body { padding: 0; }
      .ticket { width: 100%; }
    }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [autoPrint, open, sale])

  if (!sale) return null

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Comprobante de venta</DialogTitle>
      <DialogDescription>
        Transacción #{sale.displayNumber} · {formatReceiptDateTime(sale.createdAt)}
      </DialogDescription>

      <DialogBody>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
          <div ref={printRef}>
            <div className="ticket mx-auto max-w-[280px] font-mono text-xs text-zinc-900 dark:text-zinc-100">
              <div className="center">
                <p className="title text-sm font-bold">{organizationName}</p>
                <p className="muted text-zinc-500 dark:text-zinc-400">Comprobante de venta</p>
                <p className="mt-2">#{sale.displayNumber}</p>
                <p className="muted text-zinc-500 dark:text-zinc-400">
                  {formatReceiptDateTime(sale.createdAt)}
                </p>
              </div>

              <div className="divider my-3 border-t border-dashed border-zinc-300 dark:border-zinc-600" />

              <div className="space-y-1">
                <div className="row flex justify-between gap-3">
                  <span className="muted text-zinc-500 dark:text-zinc-400">Cliente</span>
                  <span>{sale.customerName ?? 'Público general'}</span>
                </div>
                <div className="row flex justify-between gap-3">
                  <span className="muted text-zinc-500 dark:text-zinc-400">Empleado</span>
                  <span>{sale.employeeName ?? '—'}</span>
                </div>
                <div className="row flex justify-between gap-3">
                  <span className="muted text-zinc-500 dark:text-zinc-400">Pago</span>
                  <span>
                    {sale.paymentMethod
                      ? PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="divider my-3 border-t border-dashed border-zinc-300 dark:border-zinc-600" />

              <div className="space-y-2">
                {sale.lines.map((line) => (
                  <div key={line.id} className="space-y-0.5">
                    <p className="line-name font-medium">{line.productName}</p>
                    <div className="row flex justify-between gap-3">
                      <span className="line-qty text-zinc-500 dark:text-zinc-400">
                        {line.quantity} × {formatCurrency(line.unitPrice)}
                      </span>
                      <span className="line-total">{formatCurrency(line.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider my-3 border-t border-dashed border-zinc-300 dark:border-zinc-600" />

              <div className="space-y-1">
                <div className="row flex justify-between gap-3">
                  <span>Subtotal</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discountTotal > 0 ? (
                  <div className="row flex justify-between gap-3">
                    <span>Descuento</span>
                    <span>−{formatCurrency(sale.discountTotal)}</span>
                  </div>
                ) : null}
                <div className="row flex justify-between gap-3 total mt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
              </div>

              <p className="center muted mt-4 text-zinc-500 dark:text-zinc-400">
                ¡Gracias por su compra!
              </p>
            </div>
          </div>
        </div>

        {sale.paymentStatus === 'voided' ? (
          <Text className="mt-4 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!" role="status">
            Esta venta está anulada.
          </Text>
        ) : null}
      </DialogBody>

      <DialogActions>
        <Button type="button" plain onClick={onClose}>
          Cerrar
        </Button>
        <Button type="button" color="dark/zinc" onClick={handlePrint}>
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  )
}
