import { ListFactTablesResponse } from "shared/types/openapi";
import { listFactTablesValidator } from "shared/validators";
import {
  getFactTablesPaginated,
  toFactTableApiInterface,
} from "back-end/src/models/FactTableModel";
import {
  buildPaginationFields,
  createApiRequestHandler,
  getPaginationOptions,
} from "back-end/src/util/handler";

export const listFactTables = createApiRequestHandler(listFactTablesValidator)(
  async (req): Promise<ListFactTablesResponse> => {
    // Build MongoDB filter for better performance
    const filter: Record<string, unknown> = {};

    if (req.query.datasourceId) {
      filter.datasource = req.query.datasourceId;
    }
    if (req.query.projectId) {
      // Match if: projects array contains the projectId OR projects is empty/missing
      // (empty projects means the fact table is available to all projects)
      filter.$or = [
        { projects: req.query.projectId },
        { projects: { $size: 0 } },
        { projects: { $exists: false } },
      ];
    }

    const { limit, offset } = getPaginationOptions(req.query);

    // Use database-level pagination for better performance
    const { items, total } = await getFactTablesPaginated(req.context, {
      filter,
      limit,
      skip: offset,
    });

    return {
      factTables: items.map((factTable) => toFactTableApiInterface(factTable)),
      ...buildPaginationFields({ items, total, limit, offset }),
    };
  },
);
