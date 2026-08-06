<?php

namespace App\Enums;

enum InvestigationRequestType: string
{
    case SearchWarrant = 'search_warrant';
    case FinancialSubpoena = 'financial_subpoena';
    case ToxicologyReport = 'toxicology_report';
    case WiretapAuthorization = 'wiretap_authorization';
    case BallisticsAnalysis = 'ballistics_analysis';
    case DigitalForensics = 'digital_forensics';
    case ExhumationOrder = 'exhumation_order';

    public function label(): string
    {
        return match($this) {
            self::SearchWarrant => 'Search Warrant Execution',
            self::FinancialSubpoena => 'Subpoena of Financial Records',
            self::ToxicologyReport => 'Advanced Toxicology Screen',
            self::WiretapAuthorization => 'Communications Wiretap',
            self::BallisticsAnalysis => 'Firearm Ballistics Match',
            self::DigitalForensics => 'Device Decryption & Forensics',
            self::ExhumationOrder => 'Coroner Exhumation Order',
        };
    }
}