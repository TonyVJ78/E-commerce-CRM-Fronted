import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogFocusDirective } from './dialog-focus.directive';

@Component({standalone:true,imports:[DialogFocusDirective],template:`
  <button id="opener">Abrir</button>
  @if(open) { <section appDialogFocus role="dialog" aria-label="Demo" (dialogEscape)="open=false"><button id="first">Cerrar</button><button disabled>Deshabilitado</button><button id="last">Guardar</button></section> }
`})
class DemoDialog {open=false;}

describe('CU39 diálogos con teclado',()=>{
  it('enfoca el diálogo y devuelve el foco al abrir y cerrar con Escape',()=>{
    const f=TestBed.createComponent(DemoDialog); f.detectChanges();
    const opener=f.nativeElement.querySelector('#opener'); opener.focus();
    f.componentInstance.open=true; f.detectChanges();
    expect(document.activeElement).toBe(f.nativeElement.querySelector('#first'));
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); f.detectChanges();
    expect(f.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it('cicla Tab y Shift+Tab sin salir del diálogo ni enfocar controles deshabilitados',()=>{
    const f=TestBed.createComponent(DemoDialog); f.componentInstance.open=true; f.detectChanges();
    const first=f.nativeElement.querySelector('#first'),last=f.nativeElement.querySelector('#last');
    first.focus(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
    expect(document.activeElement).toBe(last);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
    expect(document.activeElement).toBe(first);
  });
});
