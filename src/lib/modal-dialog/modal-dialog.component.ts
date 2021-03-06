﻿import { Component, Input, Output, ElementRef, EventEmitter, NgZone, ViewChild } from '@angular/core'
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import newGuid from '../utils/newGuid';

@Component({
	selector: 'modal-dialog',
	template: `
<div class="modal-dialog-container component" *ngIf='shown' #dialog [style.left]="overrideLeft" [style.top]="overrideTop" id="id_{{uniqueId}}">
	<div class="modal-dialog-header" *ngIf="showHeader">
		<button class="icon-remove-black icon-small icon-button modal-close-button" *ngIf="!hideCloseButton"  (click)="hide()">
        </button>
        <div class="modal-title"><strong>{{headerText}}</strong></div>
	</div>
	<div *ngIf="!bodyContent">
		<ng-content></ng-content>
	</div>
	<div *ngIf="bodyContent" class="modal-dialog-body">
		<div [innerHtml]="bodyContent">
		</div>
	</div>
	<div class="modal-dialog-footer" *ngIf="showFooter">
		<button type="button" class="btn" *ngIf="buttons == button.OK || buttons == button.OKCancel" (click)="ok()">OK</button>
		<button type="button" class="btn" *ngIf="buttons == button.OKCancel" (click)="cancel()" style="margin-left: 10px">Cancel</button>
        <button type="button" class="btn" *ngIf="buttons == button.YesNo" (click)="yes()" style="margin-left: 10px">Yes</button>
        <button type="button" class="btn" *ngIf="buttons == button.YesNo" (click)="no()" style="margin-left: 10px">No</button>
	</div>
</div>
<div class="modal-background" *ngIf="shown && showBackdrop"></div>
`,
	styleUrls: ['../assets/css/styles.css', '../assets/css/icons.css', '../assets/css/buttons.css', 'modal-dialog.css']
})
export class ModalDialogComponent {
	private currObserver: any;

	overrideTop;
	overrideLeft;

	button = Button;
	buttons = Button.OK;
	
	shown = false;
	
	@Input()
	headerText: string;

	@Input()
	showBackdrop = false;

	@Input()
	hideCloseButton = false;

	@Input()
	showHeader = true;

	@Input()
	showFooter = true;

	@Input()
	bodyContent: string;

	@Output()
	closing = new EventEmitter<ClosingArgs>();

	@ViewChild("dialog")
	dialog: any;

	tag: any;

	private currentonclick: any;
	uniqueId = newGuid();

	ok() {
		this.hide(DialogResult.OK);
	}

	cancel() {
		this.hide(DialogResult.Cancel);
	}

	yes() {
		this.hide(DialogResult.Yes);
	}

	no() {
		this.hide(DialogResult.No);
	}

	get isShown(): boolean {
		return this.shown;
	}

	constructor(private elementRef: ElementRef, private zone: NgZone) { }

	toggle() {
		if (!this.shown)
			this.show();
		else
			this.hide();
	}

	show(buttons = Button.OK, hideAfter = 0, x = -1, y = -1): Observable<DialogResult> {
		this.buttons = buttons;
		this.shown = true;
		if (x >= 0 && y >= 0) {
			this.overrideTop = y.toString() + "px";
			this.overrideLeft = x.toString() + "px";
		}
		if (hideAfter > 0) {
			// TODO: always ok?
			window.setTimeout(() => this.hide(DialogResult.OK),
				hideAfter + 200);
		}

		window.setTimeout(() => {
			// TODO: hackish, need to find a better way to hide drop down when they click off of it, can't use blur
			// since blur will fire when the dropdown div is clicked in which case we don't want to hide the dropdown
			let self = this;
			this.currentonclick = document.onclick;
			document.onclick = (event: any) => {
				if (this.currentonclick) this.currentonclick(event);

				if (self.shown && event.target && !self.hideCloseButton) {
					const rect = self.dialog.nativeElement.getBoundingClientRect();
					
					if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
						self.zone.run(() => self.hide());
				}
			};
		}, 200);

		return Observable.create(o => {
			this.currObserver = o;

		});
	}

	showResult(headerText: string, bodyContent: string, hideAfter: number = 0): Observable<DialogResult> {
		this.headerText = headerText;
		this.bodyContent = bodyContent;
		return this.show(Button.OK, hideAfter).pipe(map(s => {
			this.headerText = null;
			this.bodyContent = null;
			return s;
		}));
	}

	showError(headerText: string, bodyContent: string): Observable<DialogResult> {
		return this.showResult(headerText, `<div class='error-label'>${bodyContent}</div>`);
	}

	showYesNo(headerText: string, bodyContent: string): Observable<DialogResult> {
		this.headerText = headerText;
		this.bodyContent = bodyContent;
		return this.show(Button.YesNo).pipe(map(s => {
			this.headerText = null;
			this.bodyContent = null;
			return s;
		}));
	}

	hide(dialogResult: DialogResult = DialogResult.Cancel) {
		let args = new ClosingArgs();
		args.dialogResult = dialogResult;
		this.closing.emit(args);
		if (args.cancel) return;

		this.shown = false;
		this.overrideTop = null;
		this.overrideLeft = null;

		if (this.currObserver) {
			this.currObserver.next(dialogResult);
			this.currObserver.complete();
		}

		document.onclick = this.currentonclick;
	}
}

export enum Button {
	OK,
	OKCancel,
	YesNo,
	None
}

export enum DialogResult {
	OK,
	Cancel,
	Yes,
	No
}

export class ClosingArgs {
	dialogResult: DialogResult;
	cancel: boolean;
}
