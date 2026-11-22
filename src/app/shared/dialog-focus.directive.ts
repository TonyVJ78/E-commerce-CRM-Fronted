import { AfterViewInit, Directive, ElementRef, EventEmitter, HostListener, OnDestroy, Output, inject } from '@angular/core';

/** Mantiene el teclado en el diálogo y devuelve el foco a la acción que lo abrió. */
@Directive({selector:'[appDialogFocus]',standalone:true,host:{tabindex:'-1'}})
export class DialogFocusDirective implements AfterViewInit, OnDestroy {
  @Output() dialogEscape = new EventEmitter<void>();
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private previous: HTMLElement | null = null;

  private controls(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>(
      'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
    )).filter(e=>e.getClientRects().length>0 && !e.closest('[hidden],[inert]'));
  }
  ngAfterViewInit(): void {
    this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (this.controls()[0] ?? this.element.nativeElement).focus();
  }
  @HostListener('document:keydown',['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key==='Escape') {
      event.preventDefault(); event.stopPropagation(); this.dialogEscape.emit(); return;
    }
    if (event.key!=='Tab') return;
    const controls=this.controls(); const first=controls[0]; const last=controls[controls.length-1];
    if (!first) { event.preventDefault(); this.element.nativeElement.focus(); return; }
    const active=document.activeElement;
    if (!this.element.nativeElement.contains(active) || (event.shiftKey && active===first) || (!event.shiftKey && active===last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  }
  ngOnDestroy(): void { if(this.previous?.isConnected) this.previous.focus(); }
}
