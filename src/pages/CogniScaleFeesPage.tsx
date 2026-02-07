import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCogniScaleServices } from "@/hooks/useCogniScaleServices";
import { formatGBP } from "@/lib/formatters";

export function CogniScaleFeesPage() {
  const {
    billableServices,
    variableServices,
    totalFixedFee,
    monthlyFixedFee,
    loading,
  } = useCogniScaleServices();

  return (
    <PageContainer title="CogniScale Fee Structure">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-tp-dark-grey">Monthly Fixed Fee</div>
              <div className="text-2xl font-bold text-tp-blue">{formatGBP(monthlyFixedFee)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-tp-dark-grey">Annual Fixed Fee</div>
              <div className="text-2xl font-bold text-tp-dark">{formatGBP(totalFixedFee)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-tp-dark-grey">Variable Fees</div>
              <div className="text-lg font-bold text-tp-green">
                £1,000/survey + £700/meeting
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <p className="text-sm text-tp-dark-grey">Loading fee structure...</p>
        ) : (
          <>
            {/* Billable Services (Fixed Fee) */}
            <Card>
              <CardHeader>
                <CardTitle>Billable Services (Fixed Fee)</CardTitle>
                <p className="text-sm text-tp-dark-grey">
                  These services are included in the monthly fixed fee of {formatGBP(monthlyFixedFee)}
                </p>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-tp-dark">
                      <th className="text-left py-2 px-2 font-semibold">Service</th>
                      <th className="text-left py-2 px-2 font-semibold">Harvest Code</th>
                      <th className="text-left py-2 px-2 font-semibold">Time Allocation</th>
                      <th className="text-right py-2 px-2 font-semibold">Rate</th>
                      <th className="text-right py-2 px-2 font-semibold">Annual Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billableServices.map((service) => (
                      <tr key={service.id} className="border-b border-tp-light-grey/50 hover:bg-tp-light/30">
                        <td className="py-2 px-2">
                          <div className="font-medium">{service.service_name}</div>
                          {service.notes && (
                            <div className="text-xs text-tp-dark-grey">{service.notes}</div>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-tp-blue/10 text-tp-blue">
                            {service.harvest_code}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-tp-dark-grey">{service.time_allocation || "-"}</td>
                        <td className="py-2 px-2 text-right">{service.rate ? `£${service.rate}/hr` : "-"}</td>
                        <td className="py-2 px-2 text-right font-medium">{formatGBP(service.annual_value || 0)}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="border-t-2 border-tp-dark bg-tp-light font-bold">
                      <td colSpan={4} className="py-2 px-2">TOTAL FIXED FEE</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totalFixedFee)}</td>
                    </tr>
                    <tr className="bg-tp-blue/10">
                      <td colSpan={4} className="py-2 px-2 font-medium">Monthly Fixed Fee (÷12)</td>
                      <td className="py-2 px-2 text-right font-bold text-tp-blue">{formatGBP(monthlyFixedFee)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Variable Fee Services */}
            <Card>
              <CardHeader>
                <CardTitle>Variable Fee Services</CardTitle>
                <p className="text-sm text-tp-dark-grey">
                  These fees are paid per activity completed, in addition to the fixed fee
                </p>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-tp-dark">
                      <th className="text-left py-2 px-2 font-semibold">Activity</th>
                      <th className="text-left py-2 px-2 font-semibold">Harvest Code</th>
                      <th className="text-right py-2 px-2 font-semibold">Fee</th>
                      <th className="text-left py-2 px-2 font-semibold">Trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variableServices.map((service) => (
                      <tr key={service.id} className="border-b border-tp-light-grey/50 hover:bg-tp-light/30">
                        <td className="py-2 px-2">
                          <div className="font-medium">{service.service_name}</div>
                          {service.notes && (
                            <div className="text-xs text-tp-dark-grey">{service.notes}</div>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-tp-green/10 text-tp-green">
                            {service.harvest_code}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-tp-green">
                          {formatGBP(service.rate || 0)}
                        </td>
                        <td className="py-2 px-2 text-tp-dark-grey text-sm">{service.fee_trigger || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Non-Billable Activities Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Activities Covered by Variable Fees</CardTitle>
                <p className="text-sm text-tp-dark-grey">
                  These activities are not separately billed - they are covered by the survey/meeting fees when completed
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Research & Outreach</h4>
                    <ul className="text-sm text-tp-dark-grey space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB1</span>
                        <span>Research (Nikita - Clay, LinkedIn)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB4</span>
                        <span>Outreach LinkedIn messages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB5</span>
                        <span>LinkedIn comment strategy</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Coordination</h4>
                    <ul className="text-sm text-tp-dark-grey space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB2</span>
                        <span>Vanessa coordination for interviews</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB3</span>
                        <span>Vanessa coordination for roundtables</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB6</span>
                        <span>Roundtables planning (pre-survey)</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Deliverables</h4>
                    <ul className="text-sm text-tp-dark-grey space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB7</span>
                        <span>CogniScale MVR one-pagers (roundtables)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB8</span>
                        <span>CogniScale MVR one-pagers (interviews)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tp-blue">CNB9</span>
                        <span>Interviews (excl. 6sense)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
