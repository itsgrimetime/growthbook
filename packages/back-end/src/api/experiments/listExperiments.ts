import {
  ExperimentInterfaceExcludingHoldouts,
  listExperimentsValidator,
} from "shared/validators";
import { ListExperimentsResponse } from "shared/types/openapi";
import { ProjectInterface } from "shared/types/project";
import { getExperimentsPaginated } from "back-end/src/models/ExperimentModel";
import { toExperimentApiInterface } from "back-end/src/services/experiments";
import {
  buildPaginationFields,
  createApiRequestHandler,
  getPaginationOptions,
} from "back-end/src/util/handler";

export const listExperiments = createApiRequestHandler(
  listExperimentsValidator,
)(async (req): Promise<ListExperimentsResponse> => {
  // Build MongoDB filter for better performance
  const filter: Record<string, unknown> = {};

  if (req.query.experimentId) {
    filter.trackingKey = req.query.experimentId;
  }
  if (req.query.datasourceId) {
    filter.datasource = req.query.datasourceId;
  }
  if (req.query.projectId) {
    filter.project = req.query.projectId;
  }

  const { limit, offset } = getPaginationOptions(req.query);

  // Use database-level pagination for better performance
  const { items, total } = await getExperimentsPaginated(req.context, {
    filter,
    limit,
    skip: offset,
    includeArchived: true,
  });

  // Batch-load all projects for the filtered experiments to avoid N+1 queries
  const projectIds = [
    ...new Set(items.map((exp) => exp.project).filter((p): p is string => !!p)),
  ];
  const projects = projectIds.length
    ? await req.context.models.projects.getByIds(projectIds)
    : [];
  const projectMap = new Map<string, ProjectInterface>(
    projects.map((p) => [p.id, p]),
  );

  const promises = items.map((experiment) =>
    toExperimentApiInterface(
      req.context,
      experiment as ExperimentInterfaceExcludingHoldouts,
      projectMap,
    ),
  );
  const apiExperiments = await Promise.all(promises);

  return {
    experiments: apiExperiments,
    ...buildPaginationFields({ items, total, limit, offset }),
  };
});
