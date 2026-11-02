import { Module } from '@nestjs/common';
import { CoupleModule } from '../couple/couple.module';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { AllergiesRepository } from './allergies.repository';
import { AllergiesService } from './allergies.service';
import { DoctorsRepository } from './doctors.repository';
import { DoctorsService } from './doctors.service';
import { EmergencyContactsRepository } from './emergency-contacts.repository';
import { EmergencyContactsService } from './emergency-contacts.service';
import { HealthConditionsRepository } from './health-conditions.repository';
import { HealthConditionsService } from './health-conditions.service';
import { HealthItemsController } from './health-items.controller';
import { HealthMemberAccessService } from './health-member-access.service';
import { HealthProfileRepository } from './health-profile.repository';
import { HealthProfileService } from './health-profile.service';
import { HealthRecordController } from './health-record.controller';
import { HealthRecordService } from './health-record.service';

@Module({
  imports: [CoupleModule],
  controllers: [HealthRecordController, HealthItemsController],
  providers: [
    CoupleMemberGuard,
    HealthMemberAccessService,
    HealthProfileRepository,
    HealthProfileService,
    HealthRecordService,
    AllergiesRepository,
    AllergiesService,
    HealthConditionsRepository,
    HealthConditionsService,
    EmergencyContactsRepository,
    EmergencyContactsService,
    DoctorsRepository,
    DoctorsService,
  ],
})
export class HealthRecordsModule {}
