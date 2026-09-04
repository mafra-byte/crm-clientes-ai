-- CreateTable
CREATE TABLE "ProtheusConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL DEFAULT 'Produção',
    "baseUrl" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenType" TEXT DEFAULT 'Bearer',
    "expiresAt" DATETIME,
    "lastTestAt" DATETIME,
    "lastTestOk" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protheusCode" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "document" TEXT,
    "store" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "lastOrderAt" DATETIME,
    "connectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProtheusConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protheusId" TEXT NOT NULL,
    "number" TEXT,
    "status" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "currencyId" TEXT NOT NULL DEFAULT 'BRL',
    "dateCreated" DATETIME NOT NULL,
    "dateClosed" DATETIME,
    "itemTitle" TEXT,
    "itemId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rawJson" TEXT,
    "clientId" TEXT,
    "connectionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProtheusConnection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_protheusCode_key" ON "Client"("protheusCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_protheusId_key" ON "Order"("protheusId");
