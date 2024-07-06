export const DEFAULT_DEMO_CODE = `
import { makeQueryLoader, buildView, sql } from 'slonik-trpc';
import { z } from 'zod';

const employee = z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    salary: z.number(),
    company: z.string(),
    employed_days: z.number(),
    startDate: z.string(),
    endDate: z.string(),
});
const query = sql.type(employee)\`
SELECT *
\`;

const employeeView = buildView\`FROM (
    SELECT
        employees.id,
        employees.first_name AS "firstName",
        employees.last_name AS "lastName",
        employee_companies.salary,
        companies.name AS company,
        (end_date - start_date) AS employed_days,
        companies.id AS company_id,
        employee_companies.start_date AS "startDate",
        employee_companies.end_date AS "endDate"
    FROM employees
    LEFT JOIN employee_companies
        ON employees.id = employee_companies.employee_id
    LEFT JOIN companies
        ON employee_companies.company_id = companies.id
) employees\`
.options({ orEnabled: true })
.setColumns(["id", "firstName", "lastName", "company_id", "startDate", "endDate", "employed_days", "company", "salary"])
.addInArrayFilter('employeeId', sql.fragment\`employees.id\`, 'numeric')
.addInArrayFilter('companyId', sql.fragment\`employees.company_id\`, 'numeric')
.addDateFilter('employmentStartDate', sql.fragment\`employees."startDate"\`)
.addDateFilter('employmentEndDate', sql.fragment\`employees."endDate"\`)
.addComparisonFilter('employmentSalary', sql.fragment\`employees.salary\`)
;

export const employeeLoader = makeQueryLoader({
    query: {
        select: query,
        view: employeeView,
    },
    defaults: {
        orderBy: [["id", "ASC"]],
        take: 25,
    },
    options: {
        orFilterEnabled: true,
    },
    sortableColumns: {
        id: "id",
        name: sql.fragment\`"firstName" || "lastName"\`,
        daysEmployed: "employed_days",
        startDate: "startDate",
        endDate: "endDate",
        salary: "salary",
        company: "company",
    },
    virtualFields: {
        fullName: {
            dependencies: ["firstName", "lastName"],
            resolve(row) {
                return row.firstName + ' ' + row.lastName;
            },
        },
    }
});

employeeLoader.loadPagination({
    where: {
        companyId: [126, 145],
        employmentStartDate: {
            _gte: "2023-01-01"
        },
        employmentSalary: {
            _lt: 100000
        },
    },
    orderBy: [["company", "DESC"], ["salary", "ASC"]],
    select: ["id", "firstName", "lastName", "salary", "company"],
    takeCount: true,
});

const oldEmployees = employeeView.load({
    select: ["id", "company_id"],
    where: {
        OR: [{
            employmentStartDate: {
                _lt: "2022-01-01",
            }
        }, {
            employmentSalary: {
                _gte: 100000,
            }
        }]
    },
});

`;
