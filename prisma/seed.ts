import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clients = [
  {
    protheusCode: "000001",
    name: "Casa Max Distribuidora LTDA",
    email: "compras@casamax.demo.br",
    phone: "(11) 3456-7800",
    document: "12.345.678/0001-90",
    store: "01",
    totalOrders: 3,
    totalSpent: 48750,
  },
  {
    protheusCode: "000002",
    name: "Mercado Bom Preço ME",
    email: "contato@bompreco.demo.br",
    phone: "(19) 99887-1122",
    document: "23.456.789/0001-11",
    store: "01",
    totalOrders: 2,
    totalSpent: 15890.5,
  },
  {
    protheusCode: "000003",
    name: "Construtora Horizonte SA",
    email: "suprimentos@horizonte.demo.br",
    phone: "(31) 3221-4455",
    document: "34.567.890/0001-22",
    store: "01",
    totalOrders: 2,
    totalSpent: 92300,
  },
  {
    protheusCode: "000004",
    name: "Padaria Pão Quente LTDA",
    email: "financeiro@paoquente.demo.br",
    phone: "(11) 98765-4321",
    document: "45.678.901/0001-33",
    store: "01",
    totalOrders: 1,
    totalSpent: 2450,
  },
  {
    protheusCode: "000005",
    name: "Tech Norte Soluções",
    email: "ops@technorte.demo.br",
    phone: "(92) 3344-5566",
    document: "56.789.012/0001-44",
    store: "01",
    totalOrders: 2,
    totalSpent: 31200,
  },
  {
    protheusCode: "000006",
    name: "Clínica Vida Plena",
    email: "admin@vidaplena.demo.br",
    phone: "(41) 3010-2020",
    document: "67.890.123/0001-55",
    store: "01",
    totalOrders: 1,
    totalSpent: 8900,
  },
  {
    protheusCode: "000007",
    name: "Agro Sul Cooperativa",
    email: "comercial@agrosul.demo.br",
    phone: "(51) 3555-8899",
    document: "78.901.234/0001-66",
    store: "01",
    totalOrders: 1,
    totalSpent: 67400,
  },
  {
    protheusCode: "000008",
    name: "Hotel Atlântico Plaza",
    email: "compras@atlantico.demo.br",
    phone: "(21) 2199-1000",
    document: "89.012.345/0001-77",
    store: "01",
    totalOrders: 1,
    totalSpent: 18650,
  },
];

const ordersSeed = [
  {
    protheusId: "PV-990001",
    number: "000001",
    status: "F",
    totalAmount: 18500,
    itemTitle: "Linha de embalagens premium",
    clientCode: "000001",
    daysAgo: 2,
  },
  {
    protheusId: "PV-990002",
    number: "000002",
    status: "L",
    totalAmount: 15250,
    itemTitle: "Kit reposição estoque Q3",
    clientCode: "000001",
    daysAgo: 5,
  },
  {
    protheusId: "PV-990003",
    number: "000003",
    status: "A",
    totalAmount: 15000,
    itemTitle: "Pedido complementar filiais",
    clientCode: "000001",
    daysAgo: 1,
  },
  {
    protheusId: "PV-990004",
    number: "000004",
    status: "F",
    totalAmount: 9890.5,
    itemTitle: "Mercearia seca — lote A",
    clientCode: "000002",
    daysAgo: 8,
  },
  {
    protheusId: "PV-990005",
    number: "000005",
    status: "L",
    totalAmount: 6000,
    itemTitle: "Bebidas e frios",
    clientCode: "000002",
    daysAgo: 3,
  },
  {
    protheusId: "PV-990006",
    number: "000006",
    status: "F",
    totalAmount: 54000,
    itemTitle: "Materiais de obra — torre B",
    clientCode: "000003",
    daysAgo: 12,
  },
  {
    protheusId: "PV-990007",
    number: "000007",
    status: "A",
    totalAmount: 38300,
    itemTitle: "Acabamentos e ferragens",
    clientCode: "000003",
    daysAgo: 4,
  },
  {
    protheusId: "PV-990008",
    number: "000008",
    status: "F",
    totalAmount: 2450,
    itemTitle: "Insumos padaria semanal",
    clientCode: "000004",
    daysAgo: 1,
  },
  {
    protheusId: "PV-990009",
    number: "000009",
    status: "L",
    totalAmount: 18700,
    itemTitle: "Licenças e suporte anual",
    clientCode: "000005",
    daysAgo: 6,
  },
  {
    protheusId: "PV-990010",
    number: "000010",
    status: "A",
    totalAmount: 12500,
    itemTitle: "Hardware para expansão",
    clientCode: "000005",
    daysAgo: 2,
  },
  {
    protheusId: "PV-990011",
    number: "000011",
    status: "F",
    totalAmount: 8900,
    itemTitle: "Insumos clínicos mensais",
    clientCode: "000006",
    daysAgo: 9,
  },
  {
    protheusId: "PV-990012",
    number: "000012",
    status: "L",
    totalAmount: 67400,
    itemTitle: "Safra — insumos agrícolas",
    clientCode: "000007",
    daysAgo: 7,
  },
  {
    protheusId: "PV-990013",
    number: "000013",
    status: "A",
    totalAmount: 18650,
    itemTitle: "Amenities e housekeeping",
    clientCode: "000008",
    daysAgo: 3,
  },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 30, 0, 0);
  return d;
}

async function main() {
  await prisma.order.deleteMany();
  await prisma.client.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.protheusConnection.deleteMany();

  const connection = await prisma.protheusConnection.create({
    data: {
      label: "Demo comercial — empresa 99",
      baseUrl: process.env.PROTHEUS_BASE_URL || "https://protheus.ccskf.net/rest",
      empresa: process.env.PROTHEUS_EMPRESA || "99",
      filial: process.env.PROTHEUS_FILIAL || "01",
      username: process.env.PROTHEUS_USERNAME || "Admin",
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastTestAt: new Date(),
      lastTestOk: true,
    },
  });

  const byCode = new Map<string, string>();

  for (const client of clients) {
    const created = await prisma.client.create({
      data: {
        ...client,
        source: "protheus",
        connectionId: connection.id,
        lastOrderAt: daysAgo(1),
        notes: "Cliente demonstração comercial",
      },
    });
    byCode.set(client.protheusCode, created.id);
  }

  for (const order of ordersSeed) {
    const clientId = byCode.get(order.clientCode);
    const createdAt = daysAgo(order.daysAgo);
    await prisma.order.create({
      data: {
        protheusId: order.protheusId,
        number: order.number,
        status: order.status,
        totalAmount: order.totalAmount,
        currencyId: "BRL",
        dateCreated: createdAt,
        dateClosed: order.status === "F" ? createdAt : null,
        itemTitle: order.itemTitle,
        quantity: 1,
        clientId,
        connectionId: connection.id,
        rawJson: JSON.stringify({ demo: true, ...order }),
      },
    });
  }

  // Recalculate client totals from orders for consistency
  for (const client of clients) {
    const id = byCode.get(client.protheusCode)!;
    const agg = await prisma.order.aggregate({
      where: { clientId: id },
      _sum: { totalAmount: true },
      _count: true,
      _max: { dateCreated: true },
    });
    await prisma.client.update({
      where: { id },
      data: {
        totalOrders: agg._count,
        totalSpent: agg._sum.totalAmount ?? 0,
        lastOrderAt: agg._max.dateCreated,
      },
    });
  }

  await prisma.syncLog.create({
    data: {
      type: "sync",
      status: "ok",
      message: `Demo pronta: ${clients.length} clientes e ${ordersSeed.length} pedidos`,
      details: JSON.stringify({ mode: "demo", empresa: "99", filial: "01" }),
    },
  });

  console.log(
    `Seed demo: ${clients.length} clientes, ${ordersSeed.length} pedidos, conexão ${connection.id}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
