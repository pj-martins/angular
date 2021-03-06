﻿import { EventEmitter, Type, PipeTransform } from '@angular/core';
import { FieldType, FilterMode } from './gridview-enums';
import { SortDirection } from '../shared';
import newGuid from '../utils/newGuid';

import { IGridViewCellTemplateComponent, IGridViewFilterCellTemplateComponent } from './gridview-interfaces';

export class ColumnBase {
	visible: boolean = true;
	printVisible: boolean = true;
	width: string;
	printWidth: string;
	name: string;
	columnIndex: number = 0;
	allowSizing: boolean;
	getRowCellClass: (row: any) => string;
	getRowCellStyle: (row: any) => any;
	render: (row: any) => string;
	dataChanged = new EventEmitter<any[]>();
	customProps: { [name: string]: any; } = {};

	constructor(public caption?: string) { }

	getIdentifier(): string {
		if (!this.name)
			this.name = newGuid();
		return this.name;
	}
}
export class DataColumn extends ColumnBase {
	fieldType: FieldType = FieldType.String;
	columnPipe: ColumnPipe;
	sortIndex: number = 0;
	filterValue: any;
	format: string;
	sortable: boolean;
	disableWrapping: boolean;
	filterMode: FilterMode = FilterMode.None;
	template: Type<IGridViewCellTemplateComponent>;
	editTemplate: Type<IGridViewCellTemplateComponent>;
	templateInit = new EventEmitter<IGridViewCellTemplateComponent>();
	filterTemplate: Type<IGridViewFilterCellTemplateComponent>;
	filterDelayMilliseconds = 0;
	sortDirection: SortDirection = SortDirection.None;
	customSort: (obj1: any, obj2: any) => number;
	customFilter: (obj: any) => boolean;
	required = false;
	readonly: boolean;

	private _filterOptions: any[];
	get filterOptions(): any[] {
		return this._filterOptions;
	}

	set filterOptions(v: any[]) {
		this._filterOptions = v;
		this.filterOptionsChanged.emit(v);
	}

	filterOptionsChanged: EventEmitter<any> = new EventEmitter<any>();

	constructor(public fieldName?: string, public caption?: string) {
		super(caption);
		this.dataChanged.subscribe((d: any[]) => {

		});
	}

	getCaption(): string {
		if (this.caption) return this.caption;
		let parsedFieldName = this.fieldName;
		if (!parsedFieldName || parsedFieldName == '') return '';
		if (parsedFieldName.lastIndexOf('.') > 0) {
			parsedFieldName = parsedFieldName.substring(parsedFieldName.lastIndexOf('.') + 1, parsedFieldName.length);
		}
		return parsedFieldName.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
			return str.toUpperCase();
		});
	}

	getIdentifier(): string {
		if (this.name) return this.name;
		if (this.fieldName) return this.fieldName;
		return this.caption;
	}

	setSortDirection(sortDirection: SortDirection) : DataColumn {
		this.sortDirection = sortDirection;
		return this;
	}

	setFilterMode(filterMode: FilterMode) : DataColumn {
		this.filterMode = filterMode;
		return this;
	}

	setName(name: string) : DataColumn {
		this.name = name;
		return this;
	}

	setWidth(width: string) : DataColumn {
		this.width = width;
		return this;
	}

	setFieldType(fieldType: FieldType) : DataColumn {
		this.fieldType = fieldType;
		return this;
	}

	setSortable() : DataColumn {
		this.sortable = true;
		return this;
	}

	setRequired() : DataColumn {
		this.required = true;
		return this;
	}

	setReadOnly() : DataColumn {
		this.readonly = true;
		return this;
	}
}
export class NumericColumn extends DataColumn {
	decimalPlaces = 0;
	constructor(public fieldName?: string, public caption?: string) {
		super(fieldName, caption);
		this.fieldType = FieldType.Numeric;
	}
}
export class ButtonColumn extends DataColumn {
	click = new EventEmitter<any>();
	text: string;
	class: string;
	constructor(public fieldName?: string, public caption?: string) {
		super(fieldName, caption);
	}
}
export class ColumnPipe {
	constructor(public pipe: PipeTransform, public args?: any) { }
}

export class TextAreaColumn extends DataColumn {
	rows: number = 5;
}

export class SelectColumn extends DataColumn {
	selectOptions: Array<any> = [];
	displayMember: string;
	valueMember: string;
	parentField: string;
	addBlank: boolean;
}
