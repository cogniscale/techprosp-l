-- Document Inbox feature
-- Adds contracts table and enhances documents for inbox workflow

-- Contracts/SOWs reference table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id),
  contract_name TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('sow', 'msa', 'amendment', 'other')),
  file_path TEXT, -- Google Drive path
  file_name TEXT,
  start_date DATE,
  end_date DATE,
  monthly_value DECIMAL(10,2),
  total_value DECIMAL(10,2),
  payment_terms TEXT, -- e.g., "Net 30", "Quarterly in advance"
  notes TEXT,
  extracted_data JSONB, -- AI-extracted terms
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add inbox-specific fields to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS inbox_status TEXT DEFAULT 'pending'
    CHECK (inbox_status IN ('pending', 'reviewing', 'imported', 'skipped', 'error')),
  ADD COLUMN IF NOT EXISTS document_category TEXT
    CHECK (document_category IN ('sales_invoice', 'cost_invoice', 'bank_statement', 'contract', 'other')),
  ADD COLUMN IF NOT EXISTS applies_to_month DATE, -- Which month this document relates to
  ADD COLUMN IF NOT EXISTS period_start DATE, -- For multi-month invoices
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS linked_contract_id UUID REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS linked_invoice_id UUID REFERENCES public.invoices(id),
  ADD COLUMN IF NOT EXISTS google_drive_id TEXT, -- Google Drive file ID
  ADD COLUMN IF NOT EXISTS google_drive_path TEXT, -- Full path in Google Drive
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS imported_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Update file_type check to include more types
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_file_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_file_type_check
  CHECK (file_type IN ('invoice', 'bank_statement', 'contract', 'harvest_export', 'cogniscale_log', 'sow', 'other'));

-- Index for efficient inbox queries
CREATE INDEX IF NOT EXISTS idx_documents_inbox_status ON public.documents(inbox_status);
CREATE INDEX IF NOT EXISTS idx_documents_applies_to_month ON public.documents(applies_to_month);
CREATE INDEX IF NOT EXISTS idx_documents_google_drive_id ON public.documents(google_drive_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);

-- RLS policies for contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (true);

-- Function to get inbox summary by month
CREATE OR REPLACE FUNCTION get_inbox_summary(target_month DATE)
RETURNS TABLE (
  category TEXT,
  pending_count BIGINT,
  imported_count BIGINT,
  total_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.document_category as category,
    COUNT(*) FILTER (WHERE d.inbox_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE d.inbox_status = 'imported') as imported_count,
    COALESCE(SUM((d.extracted_data->>'amount')::DECIMAL) FILTER (WHERE d.inbox_status = 'pending'), 0) as total_value
  FROM public.documents d
  WHERE d.applies_to_month = target_month
    OR (d.period_start <= target_month AND d.period_end >= target_month)
  GROUP BY d.document_category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
