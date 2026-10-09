<?php

namespace App\Enums;

enum InvestigationRequestType: string
{
    case SearchWarrant = 'search_warrant';
    case WiretapWarrant = 'wiretap_warrant';
    case FinancialRecords = 'financial_records';
    case DnaTest = 'dna_test';
    case PhoneRecords = 'phone_records';

    public function label(): string
    {
        return match($this) {
            self::SearchWarrant => 'Search Warrant',
            self::WiretapWarrant => 'Wiretap Warrant',
            self::FinancialRecords => 'Retrieve financial records',
            self::DnaTest => 'DNA test',
            self::PhoneRecords => 'phone records',
        };
    }
}
