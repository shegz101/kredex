/**
 * Barrel file: import from "../models/index.js" to get every model in one line,
 * which also ensures each schema is registered with Mongoose on startup.
 */
export { UserModel, type User } from "./User.js";
export { ShopModel, type Shop } from "./Shop.js";
export { CustomerModel, type Customer } from "./Customer.js";
export { InventoryItemModel, type InventoryItem } from "./InventoryItem.js";
export { DebtModel, type Debt } from "./Debt.js";
export { TransactionModel, type Transaction } from "./Transaction.js";
export { ApprovalModel, type Approval } from "./Approval.js";
export { ChatMessageModel, type ChatMessage } from "./ChatMessage.js";
export { InvoiceModel, type Invoice } from "./Invoice.js";
export { ReminderModel, type Reminder } from "./Reminder.js";
