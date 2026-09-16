'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HostedCheckoutPage;
const react_1 = __importDefault(require("react"));
const HostedCheckout_1 = require("../../../components/checkout/HostedCheckout");
function HostedCheckoutPage({ params }) {
    const { invoiceId } = params;
    return (<div className="w-full">
      <HostedCheckout_1.HostedCheckout invoiceId={invoiceId}/>
    </div>);
}
//# sourceMappingURL=page.js.map