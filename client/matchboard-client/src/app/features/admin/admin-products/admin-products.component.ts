import { Component } from '@angular/core';

@Component({ selector: 'products-tab', standalone: true, template: `<p>Products</p>` })
export class ProductsComponent {}

@Component({ selector: 'jobs-tab', standalone: true, template: `<p>Jobs</p>` })
export class JobsComponent {}

@Component({ selector: 'config-tab', standalone: true, template: `<p>Config</p>` })
export class ConfigComponent {}