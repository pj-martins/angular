﻿import { Injectable } from '@angular/core';
import { Http, Response, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { SortDirection } from '../shared';
import moment from 'moment-es6';

@Injectable()
export class DataService {

	constructor(protected http: Http) { }

	getOptions(): RequestOptions {
		return null;
	}

	post<TObject>(url: string, body: TObject = null): Observable<TObject> {
		return this.http.post(url, body, this.getOptions())
			.map((res: Response) => {
				if (!res.text())
					return null;
				return res.json();
			})
			.catch(this.handleError);
	}

	put<TObject>(url: string, body: TObject): Observable<TObject> {
		return this.http.put(url, body, this.getOptions())
			.map((res: Response) => {
				if (!res.text())
					return null;
				return res.json();
			})
			.catch(this.handleError);
	}

	delete(url: string): Observable<boolean> {
		return this.http.delete(url, this.getOptions())
			.map((res: Response) => {
				if (!res.text())
					return null;
				return res.json();
			})
			.catch(this.handleError);
	}

	getItems<TObject>(url: string, args?: GetArguments): Observable<Items<TObject>> {
		if (args) {
			let firstIn = true;
			if (args.params) {
				for (let p in args.params) {
					url += (firstIn ? '?' : '&') + p + '=' + args.params[p];
					firstIn = false;
				}
			}
		}

		return this.http.get(url, this.getOptions())
			.map((res: Response) => {
				return res.json();
			})
			.catch(this.handleError);
	}

	getItem<TObject>(url: string): Observable<TObject> {
		return this.http.get(url, this.getOptions())
			.map((res: Response) => {
				return res.json();
			})
			.catch(this.handleError);
	}

	private handleError(error: any) {
		// let errMessage = 'Error occured!';
		// if (error) {
		// 	if (!error.exceptionMessage && !error.message && error._body) {
		// 		try {
		// 			let parsed = JSON.parse(error._body);
		// 			if (parsed.exceptionMessage || parsed.message)
		// 				error = parsed;
		// 		}
		// 		catch (e) {
		// 			// not valid JSON
		// 		}
		// 	}
		// 	errMessage = error.exceptionMessage || error.message || error._body || error;
		// }
		// console.error(errMessage);
		// return Observable.throw(errMessage);
		return Observable.throw(error);
	}
}

export class Items<TObject> {
	data: TObject[];
	count: number;
}

export class GetArguments {
	params: { [paramName: string]: string } = {};
}

export class OrderBy {
	constructor(public sortField: string, public sortDirection: SortDirection = SortDirection.Asc) { }
}

export abstract class FilterBase {
	abstract getFilterString(): string;
}
export class FilterGroup extends FilterBase {
	operator: FilterOperator;
	filters: Array<FilterBase> = [];

	constructor(public filterOperator: FilterOperator = FilterOperator.And) {
		super();
	}

	getFilterString(): string {
		let firstIn = true;
		let filt = "";
		for (let f of this.filters) {
			let filtString = f.getFilterString();
			if (!filtString) {
				filtString = "1 eq 1";
			}
			filt += `${(firstIn ? "" : this.filterOperator == FilterOperator.And ? " and " : " or ")}(${filtString})`;
			firstIn = false;
		}
		return filt;
	}
}
export class BinaryFilter extends FilterBase {
	constructor(public fieldName: string, public filterValue: any, public filterType: FilterType = FilterType.EqualTo) {
		super();
	}

	getFilterString(): string {
		let filt = "";
		let filtValue = this.filterValue;
		if (filtValue && this.filterValue instanceof Date) {
			filtValue = `DateTime'${moment(filtValue).format("YYYY-MM-DDTHH:mm")}'`;
		}
		else if (filtValue && typeof this.filterValue != "number") {
			filtValue = `'${filtValue.toString()}'`;
		}
		let dbField = this.fieldName.substring(0, 1).toUpperCase() + this.fieldName.substring(1);
		switch (this.filterType) {
			case FilterType.EqualTo:
			case FilterType.NotEqualTo:
				filt += `${dbField} ${this.filterType == FilterType.EqualTo ? 'eq' : 'ne'} ${(!this.filterValue ? "null" : filtValue)}`;
				break;
			case FilterType.Contains:
				filt += `indexof(${dbField},${filtValue}) ge 0`;
				break;
			case FilterType.StartsWith:
				filt += `startswith(${dbField},'${this.filterValue.toString()}')`;
				break;
			case FilterType.EndsWith:
				filt += `endswith(${dbField},'${this.filterValue.toString()}')`;
				break;
			case FilterType.LessThan:
			case FilterType.LessThanOrEqual:
				filt += `${dbField} ${this.filterType == FilterType.LessThan ? 'lt' : 'le'} ${(!this.filterValue ? "null" : filtValue)}`;
				break;
			case FilterType.GreaterThan:
			case FilterType.GreaterThanOrEqual:
				filt += `${dbField} ${this.filterType == FilterType.GreaterThan ? 'gt' : 'ge'} ${(!this.filterValue ? "null" : filtValue)}`;
				break;
			default:
				throw this.filterType;
		}

		return filt;
	}
}

export enum FilterType {
	EqualTo,
	NotEqualTo,
	LessThan,
	GreaterThan,
	LessThanOrEqual,
	GreaterThanOrEqual,
	Contains,
	StartsWith,
	EndsWith
}

export enum FilterOperator {
	And,
	Or
}